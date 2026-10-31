import { useEffect, useRef, useState } from "react";

const MODEL_URL = "/models/logo.glb";

function disposeModel(model) {
  model.traverse((object) => {
    if (!object.isMesh) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    materials.forEach((material) => material.dispose());
  });
}

export default function OceanJourney() {
  const journeyRef = useRef(null);
  const stageRef = useRef(null);
  const canvasHostRef = useRef(null);
  const blackoutRef = useRef(null);
  const shopButtonEffectRef = useRef(null);
  const tiltRef = useRef({ x: 0, y: 0 });
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const stage = stageRef.current;
    const effectFrame = shopButtonEffectRef.current;
    const shopButton = stage?.querySelector(".ocean-shop-now");
    if (!stage || !effectFrame || !shopButton) return undefined;

    const syncButtonGeometry = () => {
      const stageBounds = stage.getBoundingClientRect();
      const buttonBounds = shopButton.getBoundingClientRect();
      effectFrame.contentWindow?.postMessage(
        {
          type: "shop-button-geometry",
          x: buttonBounds.left - stageBounds.left,
          y: buttonBounds.top - stageBounds.top,
          width: buttonBounds.width,
          height: buttonBounds.height,
        },
        window.location.origin,
      );
    };

    const forwardPointer = (event) => {
      const bounds = stage.getBoundingClientRect();
      effectFrame.contentWindow?.postMessage(
        {
          type: "shop-button-pointer",
          event: event.type,
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top,
          pointerType: event.pointerType,
        },
        window.location.origin,
      );
    };

    const handleEffectReady = (event) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== effectFrame.contentWindow ||
        event.data?.type !== "shop-button-effect-ready"
      ) {
        return;
      }
      stage.classList.add("shop-button-effect-ready");
      syncButtonGeometry();
    };

    const forwardPointerLeave = () => {
      effectFrame.contentWindow?.postMessage(
        { type: "shop-button-pointer-leave" },
        window.location.origin,
      );
    };

    const resizeObserver = new ResizeObserver(syncButtonGeometry);
    resizeObserver.observe(stage);
    resizeObserver.observe(shopButton);
    effectFrame.addEventListener("load", syncButtonGeometry);
    window.addEventListener("resize", syncButtonGeometry);
    window.addEventListener("message", handleEffectReady);
    stage.addEventListener("pointermove", forwardPointer);
    stage.addEventListener("pointerdown", forwardPointer);
    stage.addEventListener("pointerup", forwardPointer);
    stage.addEventListener("pointercancel", forwardPointer);
    stage.addEventListener("pointerleave", forwardPointerLeave);
    return () => {
      stage.removeEventListener("pointermove", forwardPointer);
      stage.removeEventListener("pointerdown", forwardPointer);
      stage.removeEventListener("pointerup", forwardPointer);
      stage.removeEventListener("pointercancel", forwardPointer);
      stage.removeEventListener("pointerleave", forwardPointerLeave);
      resizeObserver.disconnect();
      effectFrame.removeEventListener("load", syncButtonGeometry);
      window.removeEventListener("resize", syncButtonGeometry);
      window.removeEventListener("message", handleEffectReady);
      stage.classList.remove("shop-button-effect-ready");
    };
  }, []);

  useEffect(() => {
    const journey = journeyRef.current;
    const stage = stageRef.current;
    const canvasHost = canvasHostRef.current;
    const blackout = blackoutRef.current;
    if (!journey || !stage || !canvasHost || !blackout) return undefined;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) {
      setStatus("reduced");
      return undefined;
    }

    let disposed = false;
    let renderer;
    let scene;
    let camera;
    let sky;
    let environmentGenerator;
    let environmentScene;
    let environmentTarget;
    let water;
    let waterNormals;
    let model;
    let logoMaterial;
    let resizeObserver;
    let intersectionObserver;
    let scrollTimeline;
    let tick;
    let isVisible = false;
    let motionReduced = false;
    let activeGsap;
    const tilt = tiltRef.current;
    const flight = {
      angle: 0,
      radius: 34,
      height: 7.5,
      targetY: 4.4,
    };

    const resize = () => {
      if (!renderer || !camera || !canvasHost.clientWidth) return;
      const width = canvasHost.clientWidth;
      const height = canvasHost.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };

    const applyFlight = () => {
      if (!camera) return;
      camera.position.set(
        Math.sin(flight.angle) * flight.radius,
        flight.height,
        Math.cos(flight.angle) * flight.radius,
      );
      camera.lookAt(0, flight.targetY, 0);
    };

    const handleVisibilityChange = () => {
      const bounds = journey.getBoundingClientRect();
      isVisible =
        !document.hidden &&
        bounds.bottom > 0 &&
        bounds.top < window.innerHeight;
    };

    const handleReducedMotionChange = (event) => {
      if (!event.matches) return;
      motionReduced = true;
      if (tick && activeGsap) activeGsap.ticker.remove(tick);
      scrollTimeline?.scrollTrigger?.kill();
      scrollTimeline?.kill();
      document.body.classList.remove("ocean-fade-active");
      blackout.style.opacity = "0";
      setStatus("reduced");
    };

    const handleKeyDown = (event) => {
      const step = 0.12;
      if (event.key === "ArrowLeft") tilt.x = Math.max(-0.35, tilt.x - step);
      else if (event.key === "ArrowRight") {
        tilt.x = Math.min(0.35, tilt.x + step);
      } else if (event.key === "ArrowUp") {
        tilt.y = Math.max(-0.25, tilt.y - step);
      } else if (event.key === "ArrowDown") {
        tilt.y = Math.min(0.25, tilt.y + step);
      } else {
        return;
      }
      event.preventDefault();
    };

    stage.addEventListener("keydown", handleKeyDown);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    reducedMotion.addEventListener("change", handleReducedMotionChange);
    intersectionObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting && !document.hidden;
    });
    intersectionObserver.observe(journey);
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);

    Promise.all([
      import("three"),
      import("three/addons/objects/Water.js"),
      import("three/addons/objects/Sky.js"),
      import("three/addons/loaders/GLTFLoader.js"),
      import("gsap"),
      import("gsap/ScrollTrigger"),
    ])
      .then(
        ([
          THREE,
          { Water },
          { Sky },
          { GLTFLoader },
          gsapModule,
          scrollTriggerModule,
        ]) => {
          if (disposed || motionReduced) return;

          const gsap = gsapModule.gsap;
          activeGsap = gsap;
          const { ScrollTrigger } = scrollTriggerModule;
          gsap.registerPlugin(ScrollTrigger);

          scene = new THREE.Scene();
          scene.background = new THREE.Color(0x050505);
          camera = new THREE.PerspectiveCamera(50, 1, 0.1, 600);
          applyFlight();

          renderer = new THREE.WebGLRenderer({
            alpha: false,
            antialias: true,
            powerPreference: "low-power",
          });
          renderer.setPixelRatio(
            Math.min(
              window.devicePixelRatio || 1,
              window.innerWidth < 760 ? 1 : 1.25,
            ),
          );
          renderer.setClearColor(0x050505, 1);
          renderer.outputColorSpace = THREE.SRGBColorSpace;
          renderer.toneMapping = THREE.ACESFilmicToneMapping;
          renderer.toneMappingExposure = 0.4;
          renderer.domElement.setAttribute("aria-hidden", "true");
          canvasHost.append(renderer.domElement);

          sky = new Sky();
          sky.scale.setScalar(450000);
          sky.material.uniforms.turbidity.value = 10;
          sky.material.uniforms.rayleigh.value = 4;
          sky.material.uniforms.mieCoefficient.value = 0.002;
          sky.material.uniforms.mieDirectionalG.value = 0.8;
          const sunDirection = new THREE.Vector3().setFromSphericalCoords(
            1,
            THREE.MathUtils.degToRad(86),
            THREE.MathUtils.degToRad(0),
          );
          sky.material.uniforms.sunPosition.value.copy(sunDirection);
          scene.add(sky);

          environmentGenerator = new THREE.PMREMGenerator(renderer);
          environmentGenerator.compileEquirectangularShader();
          environmentScene = new THREE.Scene();
          environmentScene.add(sky);
          environmentTarget = environmentGenerator.fromScene(environmentScene);
          scene.add(sky);
          scene.environment = environmentTarget.texture;

          waterNormals = new THREE.TextureLoader().load(
            "/textures/waternormals.jpg",
            undefined,
            undefined,
            (error) => {
              console.error("Unable to load the ocean normal texture:", error);
            },
          );
          waterNormals.wrapS = THREE.RepeatWrapping;
          waterNormals.wrapT = THREE.RepeatWrapping;
          water = new Water(new THREE.PlaneGeometry(1600, 1600), {
            textureWidth: 512,
            textureHeight: 512,
            waterNormals,
            sunDirection,
            sunColor: 0xffffff,
            waterColor: 0x001e0f,
            distortionScale: 3.7,
            alpha: 1,
            fog: false,
          });
          water.rotation.x = -Math.PI / 2;
          water.material.uniforms.size.value = 1;
          water.position.y = 0;
          scene.add(water);

          scene.add(new THREE.HemisphereLight(0xffffff, 0x253040, 1.8));
          const mainLight = new THREE.DirectionalLight(0xffffff, 3);
          mainLight.position.set(150, 200, -700);
          scene.add(mainLight);
          const sideLight = new THREE.DirectionalLight(0xffffff, 2);
          sideLight.position.set(-200, 80, -850);
          scene.add(sideLight);
          const topLight = new THREE.DirectionalLight(0xffffff, 1.5);
          topLight.position.set(0, 300, -900);
          scene.add(topLight);

          logoMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xe8e8e8,
            metalness: 1,
            roughness: 0.06,
            envMapIntensity: 4,
            clearcoat: 1,
            clearcoatRoughness: 0.02,
            side: THREE.DoubleSide,
          });

          scrollTimeline = gsap.timeline({
            scrollTrigger: {
              trigger: journey,
              start: "top top",
              end: () => `+=${Math.round(window.innerHeight * 1.7)}`,
              pin: stage,
              scrub: 1.1,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          });

          scrollTimeline
            .to(flight, {
              angle: 2.2,
              radius: 28,
              height: 5.8,
              targetY: 4.6,
              duration: 0.42,
              ease: "none",
              onUpdate: applyFlight,
            })
            .to(flight, {
              angle: 5.9,
              radius: 22,
              height: 4.3,
              targetY: 4.4,
              duration: 0.56,
              ease: "none",
              onUpdate: applyFlight,
            })
            .to(flight, {
              angle: 9.7,
              radius: 17,
              height: 3.2,
              targetY: 4.2,
              duration: 0.68,
              ease: "none",
              onUpdate: applyFlight,
            })
            .to(flight, {
              angle: 13.4,
              radius: 12.5,
              height: 2.5,
              targetY: 4.1,
              duration: 0.64,
              ease: "none",
              onUpdate: applyFlight,
            })
            .to(blackout, {
              opacity: 1,
              duration: 0.18,
              ease: "none",
              onUpdate: () => {
                document.body.classList.toggle(
                  "ocean-fade-active",
                  Number(gsap.getProperty(blackout, "opacity")) > 0,
                );
              },
              onReverseComplete: () =>
                document.body.classList.remove("ocean-fade-active"),
            });

          tick = (_time, deltaTime) => {
            if (
              disposed ||
              !isVisible ||
              !renderer ||
              !model ||
              document.hidden
            ) {
              return;
            }
            const delta = Math.min(deltaTime, 40);
            water.material.uniforms.time.value += delta * 0.001;
            model.rotation.y += delta * 0.00016;
            model.rotation.x += (tilt.y * 0.3 - model.rotation.x) * 0.025;
            model.rotation.z += (tilt.x * 0.45 - model.rotation.z) * 0.025;
            renderer.render(scene, camera);
          };
          gsap.ticker.add(tick);

          new GLTFLoader().load(
            MODEL_URL,
            (gltf) => {
              if (disposed) {
                disposeModel(gltf.scene);
                return;
              }

              model = gltf.scene;
              const bounds = new THREE.Box3().setFromObject(model);
              const center = bounds.getCenter(new THREE.Vector3());
              const size = bounds.getSize(new THREE.Vector3());
              const largestDimension = Math.max(size.x, size.y, size.z);
              if (!largestDimension) {
                console.error("The RAIZED 3D logo has no visible geometry.");
                disposeModel(model);
                model = null;
                setStatus("error");
                return;
              }

              model.position.sub(center);
              model.scale.multiplyScalar(7.4 / largestDimension);
              model.position.set(0, 4.2, 0);
              model.traverse((object) => {
                if (!object.isMesh) return;
                const sourceMaterials = Array.isArray(object.material)
                  ? object.material
                  : [object.material];
                object.material = logoMaterial;
                sourceMaterials.forEach((material) => material.dispose());
              });

              scene.add(model);
              renderer.render(scene, camera);
              setStatus("ready");
              ScrollTrigger.refresh();
            },
            undefined,
            (error) => {
              console.error("Unable to load the RAIZED 3D logo:", error);
              if (!disposed) setStatus("error");
            },
          );

          resize();
          ScrollTrigger.refresh();
        },
      )
      .catch((error) => {
        console.error("Unable to initialize the ocean journey:", error);
        if (!disposed) setStatus("error");
      });

    return () => {
      disposed = true;
      stage.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      reducedMotion.removeEventListener("change", handleReducedMotionChange);
      document.body.classList.remove("ocean-fade-active");
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      scrollTimeline?.scrollTrigger?.kill();
      scrollTimeline?.kill();
      if (tick) {
        import("gsap").then(({ gsap }) => gsap.ticker.remove(tick));
      }
      if (water) {
        water.geometry.dispose();
        water.material.dispose();
        water.material.uniforms.mirrorSampler.value.dispose();
      }
      sky?.geometry.dispose();
      sky?.material.dispose();
      environmentTarget?.dispose();
      environmentGenerator?.dispose();
      waterNormals?.dispose();
      logoMaterial?.dispose();
      if (model) disposeModel(model);
      renderer?.dispose();
      renderer?.domElement.remove();
    };
  }, []);

  return (
    <section className="ocean-journey" ref={journeyRef}>
      <div
        className={`ocean-stage${status === "ready" ? " ocean-ready" : ""}${status === "reduced" ? " ocean-reduced" : ""}`}
        ref={stageRef}
        role="group"
        aria-label="Interactive ocean scene with the RAIZED logo. Scroll to approach and use the arrow keys to tilt the logo."
        tabIndex={0}
      >
        <h1 className="sr-only">RAIZED®</h1>
        <div className="ocean-canvas" ref={canvasHostRef} aria-hidden="true" />
        <iframe
          className="ocean-shop-webgl"
          src="/venom-button.html"
          title="Shop Now WebGL effect"
          aria-hidden="true"
          tabIndex={-1}
          ref={shopButtonEffectRef}
        />
        {(status === "loading" ||
          status === "error" ||
          status === "reduced") && (
          <img
            className="ocean-fallback-logo"
            src="/images/logo-orange-bg.svg"
            alt=""
          />
        )}
        <a className="ocean-shop-now" href="#collection-products">
          SHOP NOW
        </a>
        <p className="ocean-scroll-cue">
          SCROLL TO EXPLORE <span aria-hidden="true">↓</span>
        </p>
        <div className="ocean-blackout" ref={blackoutRef} aria-hidden="true" />
      </div>
    </section>
  );
}
