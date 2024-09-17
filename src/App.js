import { TextureLoader } from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import React, { useEffect, useRef, useState } from "react";
import * as handTrack from "handtrackjs";
import { PresentationControls, Stage } from "@react-three/drei";

const HandTrackMobile = () => {
  const videoRef = useRef(null);
  const [model, setModel] = useState(null);
  const [isVideo, setIsVideo] = useState(false);
  const [handPosition, setHandPosition] = useState(null);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Load the handTrack model once when the component mounts
    const modelParams = {
      maxNumBoxes: 1, // Only detect one hand
      scoreThreshold: 0.6, // Confidence threshold
    };

    handTrack
      .load(modelParams)
      .then((loadedModel) => {
        setModel(loadedModel);
      })
      .catch((err) => {
        console.error("Model loading error:", err);
      });
  }, []);

  const startVideo = async () => {
    if (model) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: "environment" }, // Request the rear camera
          },
        });
        videoRef.current.srcObject = stream;
        setIsVideo(true);

        // Start hand detection once video starts
        handTrack.startVideo(videoRef.current).then((status) => {
          if (status) {
            runDetection();
          } else {
            console.log("Unable to start video");
          }
        });
      } catch (err) {
        console.error("Error accessing camera: ", err);
      }
    } else {
      console.log("Model not loaded yet.");
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
    if (model) {
      const detect = () => {
        model.detect(videoRef.current).then((predictions) => {
          if (predictions.length > 0) {
            const hand = predictions[0].bbox; // Bounding box of the detected hand
            const handX = hand[0] + hand[2] / 2; // X position (center of hand)
            const handY = hand[1] + hand[3] / 2; // Y position (center of hand)
            setHandPosition({ x: handX, y: handY });
            // Transform handPosition to 3D coordinates
            setImagePosition({
              x: (handX / window.innerWidth) * 2 - 1, // Normalized X coordinate
              y: -(handY / window.innerHeight) * 2 + 1, // Normalized Y coordinate
            });
          }
          requestAnimationFrame(detect); // Continue detection in a loop
        });
      };
      detect(); // Start detection loop
    }
  };

  console.log("handPosition: ", handPosition);
  const Image = ({ position }) => {
    const [texture, setTexture] = useState(null);
    const imageRef = useRef();

    useEffect(() => {
      const loader = new TextureLoader();
      loader.load("/logo192.png", (texture) => {
        setTexture(texture);
      });
    }, []);

    useFrame(() => {
      if (imageRef.current) {
        imageRef.current.position.set(position.x, position.y, 0);
      }
    });

    return texture && isVideo ? (
      <mesh ref={imageRef}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={texture} />
      </mesh>
    ) : null;
  };

  return (
    <div>
      <h1>HandTrack.js Mobile</h1>
      <button onClick={startVideo} disabled={isVideo}>
        Start Video
      </button>
      <button onClick={stopVideo} disabled={!isVideo}>
        Stop Video
      </button>
      <div
        style={{
          position: "relative",
          height: "400px",
          backgroundColor: "wheat",
        }}
      >
        <video
          ref={videoRef}
          className="video-container"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: isVideo ? "block" : "none",
            zIndex: 1,
          }}
          autoPlay
        />
        <div>
          <Canvas
            shadows
            camera={{ fov: 45 }}
            dpr={[1, 2]}
            style={{ position: "absolute", zIndex: 2 }}
          >
            <PresentationControls
              speed={1.5}
              global
              zoom={0.5}
              polar={[-0.1, Math.PI / 4]}
            >
              <Stage environment={"sunset"}>
                <ambientLight />
                <pointLight position={[10, 10, 10]} />
                <Image position={imagePosition} />
              </Stage>
            </PresentationControls>
          </Canvas>
        </div>
      </div>
    </div>
  );
};

export default HandTrackMobile;
