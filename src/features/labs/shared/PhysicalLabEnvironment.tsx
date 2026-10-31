/** Shared physical room shell only. Put kit-specific props in the kit stage, not here. */
export function PhysicalLabEnvironment() {
  return <group>
    <color attach="background" args={["#e4e8e5"]} />
    <ambientLight intensity={1.1} />
    <directionalLight position={[3, 7, 4]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0003} />
    <mesh position={[0, -0.08, 0]} receiveShadow><boxGeometry args={[5.4, .2, 3]} /><meshStandardMaterial color="#ad794c" roughness={.5} /></mesh>
    <mesh position={[0, -.2, 0]}><boxGeometry args={[5.3, .08, 2.9]} /><meshStandardMaterial color="#63452e" /></mesh>
    {[-2.3, 2.3].flatMap(x => [-1.1, 1.1].map(z => <mesh key={`${x}:${z}`} position={[x, -.75, z]} castShadow><boxGeometry args={[.12, 1.1, .12]} /><meshStandardMaterial color="#47565b" metalness={.5} roughness={.4} /></mesh>))}
    <mesh position={[0, 1.8, -3]} receiveShadow><boxGeometry args={[15, 6, .12]} /><meshStandardMaterial color="#eeeee6" /></mesh>
    <mesh position={[-6, 1.8, 0]} receiveShadow><boxGeometry args={[.12, 6, 12]} /><meshStandardMaterial color="#dce4df" /></mesh>
    {Array.from({ length: 12 }, (_, x) => Array.from({ length: 10 }, (_, z) => <mesh key={`${x}:${z}`} rotation={[-Math.PI/2, 0, 0]} position={[x-5.5, -1.32, z-4.5]} receiveShadow><planeGeometry args={[.985, .985]} /><meshStandardMaterial color={(x+z)%2 ? "#c7d0cc" : "#e1e5de"} roughness={.8} /></mesh>))}
    {[-3.8, -2.2, 2.5, 4.1].map(x => <group key={x} position={[x, -.45, -2.35]}>
      <mesh castShadow receiveShadow><boxGeometry args={[1.5, 1.65, 1]} /><meshStandardMaterial color="#a8bcb2" /></mesh>
      <mesh position={[0,.86,0]} receiveShadow><boxGeometry args={[1.6,.1,1.1]} /><meshStandardMaterial color="#f1efe4" /></mesh>
      {[-.37,.37].map(dx => <group key={dx}><mesh position={[dx,0,.51]}><boxGeometry args={[.7,1.45,.03]} /><meshStandardMaterial color="#bbcbc3" /></mesh><mesh position={[dx,.4,.55]}><boxGeometry args={[.22,.04,.05]} /><meshStandardMaterial color="#596a6b" metalness={.8} roughness={.4} /></mesh></group>)}
    </group>)}
    <group position={[2.5,.44,-2.35]}>
      <mesh rotation={[-Math.PI/2,0,0]}><boxGeometry args={[.85,.6,.08]} /><meshStandardMaterial color="#677779" metalness={.8} roughness={.3} /></mesh>
      <mesh position={[0,.23,-.32]}><cylinderGeometry args={[.025,.025,.5]} /><meshStandardMaterial color="#bcc8ca" metalness={.9} roughness={.2} /></mesh>
      <mesh position={[0,.47,-.2]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.025,.025,.26]} /><meshStandardMaterial color="#bcc8ca" metalness={.9} roughness={.2} /></mesh>
    </group>
  </group>;
}
