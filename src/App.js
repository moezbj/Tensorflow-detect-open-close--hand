/* import { Canvas } from "@react-three/fiber";
import { useGLTF, Stage, PresentationControls } from "@react-three/drei";
import * as handTrack from "handtrackjs";
import { useEffect, useRef, useState } from "react";
import "./App.css";


function App() {
  const videoRef = useRef(null);
  const [handPosition, setHandPosition] = useState(null);

  function Model(props) {
    const { scene } = useGLTF("/test.glb");
    console.log("sc", scene);
    // scene.position = { x: handPosition.x, y: handPosition.y };
    return <primitive object={scene} {...props} />;
  }

  useEffect(() => {
    // Load Handtrack.js model
    const modelParams = {
      flipHorizontal: true, // Flip camera for selfie view
      maxNumBoxes: 1, // Only detect one hand
      scoreThreshold: 0.6, // Confidence threshold
    };

    handTrack.load(modelParams).then((model) => {
      // Start the video stream
      handTrack.startVideo(videoRef.current).then((status) => {
        if (status) {
          runDetection(model);
        }
      });
    });

    const runDetection = (model) => {
      setInterval(() => {
        model.detect(videoRef.current).then((predictions) => {
          if (predictions.length > 0) {
            const hand = predictions[0].bbox; // Bounding box of the detected hand
            const handX = hand[0] + hand[2] / 2; // X position (center of hand)
            const handY = hand[1] + hand[3] / 2; // Y position (center of hand)
            setHandPosition({ x: handX, y: handY });
          }
        });
      }, 100);
    };
  }, []);
  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      
      <video
        ref={videoRef}
        className="video-container"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          width: "100vw",
          height: "100%",
          objectFit: "cover",
          zIndex: 1,
        }}
      />
      <Canvas
        dpr={[1, 2]}
        shadows
        camera={{ fov: 45 }}
        className="canvas-container"
        style={{
          position: "absolute",
          zIndex: 3,
          width: "120px",
          height: "120px",
        }}
      >
        <color attach="background" args={[]} />
        <PresentationControls
          speed={1.5}
          global
          zoom={0.5}
          polar={[-0.1, Math.PI / 4]}
        >
          <Stage environment={"sunset"}>
            <Model scale={0.01} />
          </Stage>
        </PresentationControls>
      </Canvas>
    </div>
  );
}

export default App;
 */
import React, { useEffect, useRef, useState } from "react";
import * as handTrack from "handtrackjs";

const HandTrackMobile = () => {
  const videoRef = useRef(null);
  const [model, setModel] = useState(null);
  const [isVideo, setIsVideo] = useState(false);

  useEffect(() => {
    // Load Handtrack.js model
    handTrack.load().then((loadedModel) => {
      setModel(loadedModel);
    });
  }, []);

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      videoRef.current.srcObject = stream;
      setIsVideo(true);
    } catch (err) {
      console.error("Error accessing camera: ", err);
    }
  };

  const stopVideo = () => {
    const stream = videoRef.current.srcObject;
    const tracks = stream.getTracks();

    tracks.forEach((track) => track.stop());
    videoRef.current.srcObject = null;
    setIsVideo(false);
  };

  const runDetection = () => {
    if (model && isVideo) {
      model.detect(videoRef.current).then((predictions) => {
        console.log("Predictions: ", predictions);
      });
    }
  };

  useEffect(() => {
    if (isVideo) {
      const interval = setInterval(runDetection, 100);
      return () => clearInterval(interval);
    }
  }, [isVideo, model]);

  return (
    <div>
      <h1>HandTrack.js Mobile</h1>
      <video
        ref={videoRef}
        style={{
          width: "100%",
          maxHeight: "400px",
          display: isVideo ? "block" : "none",
        }}
        autoPlay
        playsInline
      />
      <button onClick={startVideo} disabled={isVideo}>
        Start Video
      </button>
      <button onClick={stopVideo} disabled={!isVideo}>
        Stop Video
      </button>
    </div>
  );
};

export default HandTrackMobile;
