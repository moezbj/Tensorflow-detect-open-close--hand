import { TextureLoader } from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import React, { useEffect, useRef, useState } from "react";
import * as handTrack from "handtrackjs";
import { PresentationControls, Stage } from "@react-three/drei";
import { useLoader } from "@react-three/fiber";
import * as THREE from "three";

const HandTrackMobile = () => {
  const videoRef = useRef(null);
  const [model, setModel] = useState(null);
  const [isVideo, setIsVideo] = useState(false);
  const [handPosition, setHandPosition] = useState(null);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [videoDevices, setVideoDevices] = useState([]); // Store available cameras
  const [selectedDeviceId, setSelectedDeviceId] = useState(null); // Selected camera
  const [rearCameraId, setRearCameraId] = useState(null);

  const getVideoDevices = async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(
      (device) => device.kind === "videoinput"
    );
    setVideoDevices(videoDevices);
    if (videoDevices.length > 0) {
      setSelectedDeviceId(videoDevices[1].deviceId); // Select the first camera by default
    }
  };

  const startVideo = async () => {
    setError("");
    setIsLoading(true);
    try {
      if (videoRef.current.srcObject) {
        const existingStream = videoRef.current.srcObject;
        const tracks = existingStream.getTracks();
        tracks.forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }

      const rearCamera = videoDevices.find(
        (device) =>
          device.label.toLowerCase().includes("back") ||
          device.label.toLowerCase().includes("rear")
      );

      if (!rearCamera) {
        console.error("Rear camera not found.");
        setError("Rear camera not found.");
        setIsLoading(false);
        return;
      }

      setRearCameraId(rearCamera.deviceId); // Save the rear camera device ID

      const constraints = {
        video: {
          deviceId: rearCamera.deviceId
            ? { exact: rearCamera.deviceId }
            : undefined, // Use rear camera deviceId
        },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoRef.current.srcObject = stream;

      const modelParams = {
        flipHorizontal: false, // Don't flip for the rear camera
        maxNumBoxes: 1, // Only detect one hand
        scoreThreshold: 0.6, // Confidence threshold
      };
      const loadedModel = await handTrack.load(modelParams);
      setModel(loadedModel);
      setIsLoading(false);
      setIsVideo(true);

      // Start hand detection once video starts
      const status = await handTrack.startVideo(videoRef.current);
      if (status) {
        runDetection(loadedModel);
      } else {
        console.error("Failed to start video.");
      }
    } catch (err) {
      console.error("Error accessing camera: ", err);
      setError("Error accessing camera.");
      setIsLoading(false);
    }
  };

  const stopVideo = () => {
    if (videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsVideo(false);
  };

  const runDetection = (loadedModel) => {
    const detect = () => {
      loadedModel.detect(videoRef.current).then((predictions) => {
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
  };

  const handleCameraChange = (event) => {
    const deviceId = event.target.value;
    setSelectedDeviceId(deviceId);
    startVideo(deviceId); // Start the video with the selected camera
  };

  useEffect(() => {
    getVideoDevices(); // Get available cameras on mount

    return () => {
      stopVideo(); // Clean up video when unmounting
    };
  }, []);

  const Image = ({ position }) => {
    const imageRef = useRef();
    const texture = useLoader(THREE.TextureLoader, "/henna.png");

    useEffect(() => {
      if (texture) {
        const aspectRatio = texture.image.width / texture.image.height;
        const planeWidth = 1; // Set this to the desired width
        const planeHeight = planeWidth / aspectRatio;
        // Adjust the plane geometry to the image aspect ratio
        imageRef.current.geometry.dispose(); // Dispose the old geometry
        imageRef.current.geometry = new THREE.PlaneGeometry(
          planeWidth,
          planeHeight
        );
      }
    }, [texture]);

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
      <h1 style={{ textAlign: "center" }}>HandTrack.js Mobile</h1>
      <h4 style={{ textAlign: "center" }}>v: 0.1.1</h4>
      <h5 style={{ textAlign: "center", color: "red" }}>{error}</h5>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <button
          style={{ marginBottom: "20px", marginRight: "20px", height: "40px" }}
          onClick={() => startVideo(selectedDeviceId)}
          disabled={isVideo}
        >
          Start Video
        </button>
        <button
          style={{ marginBottom: "20px", marginLeft: "20px", height: "40px" }}
          onClick={stopVideo}
          disabled={!isVideo}
        >
          Stop Video
        </button>
        <select
          value={selectedDeviceId}
          onChange={handleCameraChange}
          style={{ marginLeft: "20px", height: "40px" }}
        >
          {videoDevices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Camera ${device.deviceId}`}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          position: "relative",
          height: "400px",
          backgroundColor: "wheat",
        }}
      >
        {isLoading && <p>Loading...</p>}
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
          {handPosition && imagePosition && (
            <Canvas
              shadows
              camera={{ fov: 120 }}
              dpr={[1, 2]}
              style={{ position: "absolute", zIndex: 2 }}
            >
              <PresentationControls
                speed={1.5}
                global
                zoom={0.1}
                polar={[-0.1, Math.PI / 4]}
              >
                <Stage environment={"sunset"}>
                  <ambientLight />
                  <pointLight position={[10, 10, 10]} />
                  <Image position={imagePosition} />
                </Stage>
              </PresentationControls>
            </Canvas>
          )}
        </div>
      </div>
    </div>
  );
};

export default HandTrackMobile;
