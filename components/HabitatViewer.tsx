import React, { useRef, useMemo } from 'react';
import { Canvas, useThree, extend } from '@react-three/fiber';
import { OrbitControls, Sphere, Cylinder } from '@react-three/drei';
import * as THREE from 'three';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { HabitatModule } from '../types';
import DownloadIcon from './icons/DownloadIcon';

// Fix: Manually extend react-three-fiber with core THREE.js components.
// This is a workaround for a potential build environment issue where TypeScript's
// automatic JSX namespace augmentation for @react-three/fiber is not working.
extend({
    Mesh: THREE.Mesh,
    PlaneGeometry: THREE.PlaneGeometry,
    MeshStandardMaterial: THREE.MeshStandardMaterial,
    AmbientLight: THREE.AmbientLight,
    DirectionalLight: THREE.DirectionalLight,
    PointLight: THREE.PointLight,
});

const ModuleMesh: React.FC<{ module: HabitatModule, position: THREE.Vector3 }> = ({ module, position }) => {
    switch (module.type) {
        case 'shuttle':
            return (
                <Cylinder args={[1.5, 1.5, 5, 32]} position={position} rotation={[Math.PI / 2, 0, 0]}>
                    <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.2} />
                </Cylinder>
            );
        case 'biodome':
            return (
                <Sphere args={[2, 32, 32]} position={position}>
                    <meshStandardMaterial color="#add8e6" opacity={0.6} transparent metalness={0.1} roughness={0.3} />
                </Sphere>
            );
        case 'tunnel':
             return (
                <Cylinder args={[0.5, 0.5, 4, 16]} position={position} rotation={[0, 0, Math.PI / 2]}>
                    <meshStandardMaterial color="#808080" metalness={0.6} roughness={0.4} />
                </Cylinder>
            );
        default:
            return null;
    }
};

const SceneContainer: React.FC<{ modules: HabitatModule[], onSceneReady: (scene: THREE.Scene) => void }> = ({ modules, onSceneReady }) => {
    const { scene } = useThree();
    
    React.useEffect(() => {
        onSceneReady(scene);
    }, [scene, modules, onSceneReady]);

    const layout = useMemo(() => {
        const positions: { [id: string]: THREE.Vector3 } = {};
        const connectionAngles: { [id: string]: number } = {};
        const placedModules = new Set<string>();
        
        let root = modules.find(m => !m.connectedToId);

        if (!root && modules.length > 0) {
            root = modules[0];
        }

        if (root) {
            const queue: HabitatModule[] = [root];
            positions[root.id] = new THREE.Vector3(0, 0, 0);
            placedModules.add(root.id);

            while (queue.length > 0) {
                const parent = queue.shift()!;
                const children = modules.filter(m => m.connectedToId === parent.id && !placedModules.has(m.id));
                
                children.forEach((child) => {
                    const parentPosition = positions[parent.id];
                    if (connectionAngles[parent.id] === undefined) {
                        connectionAngles[parent.id] = Math.random() * Math.PI * 2; // Start at a random angle
                    }
                    const angle = connectionAngles[parent.id];
                    const radius = 4;
                    const x = parentPosition.x + radius * Math.cos(angle);
                    const z = parentPosition.z + radius * Math.sin(angle);
                    positions[child.id] = new THREE.Vector3(x, 0, z);
                    connectionAngles[parent.id] += Math.PI / 3;

                    placedModules.add(child.id);
                    queue.push(child);
                });
            }
        }
        return { positions };
    }, [modules]);
    
    return (
        <>
            <ambientLight intensity={0.8} />
            <directionalLight position={[10, 15, 5]} intensity={1.5} castShadow />
            <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ffdab9" />

            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, 0]} receiveShadow>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial color="#c1440e" roughness={0.9} metalness={0.1} />
            </mesh>

            {modules.map(module =>
                layout.positions[module.id] && (
                    <ModuleMesh key={module.id} module={module} position={layout.positions[module.id]} />
                )
            )}

            <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
        </>
    );
};

const HabitatViewer: React.FC<{ modules: HabitatModule[] | null, isLoading: boolean }> = ({ modules, isLoading }) => {
    const sceneRef = useRef<THREE.Scene | null>(null);

    const handleDownload = () => {
        if (!sceneRef.current) return;
        const exporter = new OBJExporter();
        const result = exporter.parse(sceneRef.current);
        const blob = new Blob([result], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `martian-habitat-${Date.now()}.obj`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (!modules || modules.length === 0) {
        return (
            <div className="aspect-square bg-black/30 rounded-md flex items-center justify-center relative">
                {isLoading ? (
                    <div className="w-8 h-8 border-2 border-dashed rounded-full animate-spin border-orange-500/50"></div>
                ) : (
                     <p className="text-gray-600 text-xs text-center">Awaiting habitat data...</p>
                )}
            </div>
        );
    }

    return (
        <div className="aspect-square bg-black/30 rounded-md relative group cursor-grab active:cursor-grabbing">
            <Canvas
                shadows
                camera={{ position: [0, 10, 20], fov: 50 }}
                style={{ borderRadius: '6px' }}
            >
                <SceneContainer modules={modules} onSceneReady={(scene) => (sceneRef.current = scene)} />
            </Canvas>
             <button
                onClick={handleDownload}
                disabled={isLoading}
                className="absolute bottom-2 right-2 flex items-center justify-center gap-2 bg-gray-900/70 hover:bg-gray-800/90 border border-gray-500/50 text-gray-200 font-semibold p-2 rounded-md transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed opacity-0 group-hover:opacity-100 focus:opacity-100"
                aria-label="Download Habitat as .obj file"
                >
                <DownloadIcon className="w-4 h-4" />
                <span>.obj</span>
            </button>
        </div>
    );
};

export default HabitatViewer;