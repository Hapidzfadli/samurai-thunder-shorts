import React from "react";
import * as THREE from "three";

type Vec3 = [number, number, number];

/* ------------------------------------------------------------------ */
/* BINTANG TAMU: EMBER KAYU EK (SECCHIA) — objek 3D terpisah           */
/* ------------------------------------------------------------------ */
export const WoodenBucket3D: React.FC<{
  position?: Vec3;
  rotation?: Vec3;
  scale?: number;
  withRope?: boolean;
}> = ({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, withRope = true }) => (
  <group position={position} rotation={rotation} scale={scale}>
    {/* Badan ember kayu sedikit mengerucut */}
    <mesh position={[0, 0.24, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.22, 0.17, 0.48, 14]} />
      <meshStandardMaterial color="#8c582b" roughness={0.85} />
    </mesh>
    {/* Bagian dalam ember (gelap) */}
    <mesh position={[0, 0.465, 0]}>
      <cylinderGeometry args={[0.195, 0.195, 0.04, 14]} />
      <meshStandardMaterial color="#3b2210" roughness={0.95} />
    </mesh>
    {/* Garis celah papan kayu (staves) */}
    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
      const a = (i / 8) * Math.PI * 2;
      return (
        <mesh key={i} position={[Math.sin(a) * 0.195, 0.24, Math.cos(a) * 0.195]} rotation={[0, a, 0]}>
          <boxGeometry args={[0.012, 0.46, 0.012]} />
          <meshStandardMaterial color="#4a2b13" roughness={0.9} />
        </mesh>
      );
    })}
    {/* Dua ring besi gelap */}
    <mesh position={[0, 0.37, 0]} castShadow>
      <cylinderGeometry args={[0.214, 0.209, 0.045, 16]} />
      <meshStandardMaterial color="#2f323a" metalness={0.55} roughness={0.45} />
    </mesh>
    <mesh position={[0, 0.12, 0]} castShadow>
      <cylinderGeometry args={[0.19, 0.184, 0.045, 16]} />
      <meshStandardMaterial color="#2f323a" metalness={0.55} roughness={0.45} />
    </mesh>
    {/* Gagang lengkung besi */}
    <mesh position={[0, 0.48, 0]} rotation={[0, 0, 0]} castShadow>
      <torusGeometry args={[0.21, 0.014, 8, 20, Math.PI]} />
      <meshStandardMaterial color="#252830" metalness={0.6} roughness={0.4} />
    </mesh>
    {/* Tali rami terikat di gagang */}
    {withRope && (
      <mesh position={[0, 0.72, 0]} rotation={[0.08, 0, 0.12]}>
        <cylinderGeometry args={[0.016, 0.016, 0.24, 8]} />
        <meshStandardMaterial color="#c9a870" roughness={0.95} />
      </mesh>
    )}
  </group>
);

/* ------------------------------------------------------------------ */
/* L1: MUSEUM MENARA GHIRLANDINA (MODENA — ERA SEKARANG)               */
/* ------------------------------------------------------------------ */
export const SetMuseumGhirlandina: React.FC<{ showBucket?: boolean }> = ({ showBucket = true }) => (
  <group>
    {/* Lantai marmer kotak-kotak hangat */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial color="#e8decb" roughness={0.6} />
    </mesh>
    {[-3, -1, 1, 3].map((x) =>
      [-3, -1, 1, 3].map((z) =>
        (x + z) % 4 === 0 ? (
          <mesh key={`${x}_${z}`} position={[x, 0.005, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[1.95, 1.95]} />
            <meshStandardMaterial color="#d2c0a3" roughness={0.65} />
          </mesh>
        ) : null
      )
    )}

    {/* Dinding belakang bata krem & marmer */}
    <mesh position={[0, 3.6, -4.5]} receiveShadow>
      <boxGeometry args={[18, 7.5, 0.4]} />
      <meshStandardMaterial color="#efe5d1" roughness={0.85} />
    </mesh>
    {/* Panel bawah dinding (wainscoting kayu) */}
    <mesh position={[0, 0.75, -4.25]} receiveShadow>
      <boxGeometry args={[18, 1.5, 0.14]} />
      <meshStandardMaterial color="#7a5233" roughness={0.8} />
    </mesh>
    {/* Dua pilar marmer melengkung */}
    {[-3.2, 3.2].map((x) => (
      <group key={x} position={[x, 0, -4.1]}>
        <mesh position={[0, 3.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.65, 6.4, 0.65]} />
          <meshStandardMaterial color="#d9ccb4" roughness={0.75} />
        </mesh>
        <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[0.85, 0.5, 0.85]} />
          <meshStandardMaterial color="#bfae92" roughness={0.75} />
        </mesh>
      </group>
    ))}

    {/* Pigura lukisan kuno di dinding kiri & kanan */}
    {[-2.1, 2.1].map((x, idx) => (
      <group key={x} position={[x, 3.6, -4.22]}>
        <mesh castShadow>
          <boxGeometry args={[1.35, 1.7, 0.12]} />
          <meshStandardMaterial color="#b88832" metalness={0.35} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.07]}>
          <planeGeometry args={[1.1, 1.45]} />
          <meshStandardMaterial color={idx === 0 ? "#4f6d8a" : "#7c5842"} roughness={0.9} />
        </mesh>
        {/* Siluet menara / bukit di lukisan */}
        <mesh position={[0, -0.25, 0.08]}>
          <planeGeometry args={[1.05, 0.6]} />
          <meshStandardMaterial color={idx === 0 ? "#7a9458" : "#c79a5b"} roughness={0.9} />
        </mesh>
      </group>
    ))}

    {/* Spanduk kuning-biru Modena di belakang */}
    <mesh position={[0, 4.4, -4.22]}>
      <boxGeometry args={[1.4, 2.4, 0.06]} />
      <meshStandardMaterial color="#1f4685" roughness={0.85} />
    </mesh>
    <mesh position={[0, 4.4, -4.18]}>
      <boxGeometry args={[0.42, 2.4, 0.06]} />
      <meshStandardMaterial color="#e6b830" roughness={0.8} />
    </mesh>

    {/* Pedestal beludru merah + etalase kaca */}
    <group position={[0, 0, -1.2]}>
      <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.25, 1.44, 1.25]} />
        <meshStandardMaterial color="#5c2128" roughness={0.8} />
      </mesh>
      {/* Alas beludru merah terang */}
      <mesh position={[0, 1.47, 0]}>
        <boxGeometry args={[1.12, 0.08, 1.12]} />
        <meshStandardMaterial color="#a61e2a" roughness={0.9} />
      </mesh>
      {/* Plakat emas "1325" di depan pedestal */}
      <mesh position={[0, 1.05, 0.64]}>
        <boxGeometry args={[0.66, 0.28, 0.04]} />
        <meshStandardMaterial color="#e0b238" metalness={0.5} roughness={0.35} />
      </mesh>
      {/* Kaca etalase transparan + rangka tipis */}
      <mesh position={[0, 2.15, 0]}>
        <boxGeometry args={[1.16, 1.32, 1.16]} />
        <meshStandardMaterial color="#d8f0ff" transparent opacity={0.22} roughness={0.1} metalness={0.1} />
      </mesh>
      {[
        [-0.58, -0.58],
        [0.58, -0.58],
        [-0.58, 0.58],
        [0.58, 0.58],
      ].map(([cx, cz], i) => (
        <mesh key={i} position={[cx, 2.15, cz]}>
          <boxGeometry args={[0.04, 1.34, 0.04]} />
          <meshStandardMaterial color="#c99e32" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
      {showBucket && <WoodenBucket3D position={[0, 1.52, 0]} scale={1.35} withRope={false} />}
    </group>

    {/* Tiang pembatas museum + tali merah */}
    {[-1.55, 1.55].map((x) => (
      <group key={x} position={[x, 0, 0.15]}>
        <mesh position={[0, 0.52, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 1.04, 10]} />
          <meshStandardMaterial color="#d6aa38" metalness={0.6} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.04, 0]}>
          <cylinderGeometry args={[0.18, 0.2, 0.08, 12]} />
          <meshStandardMaterial color="#b38824" metalness={0.6} roughness={0.4} />
        </mesh>
      </group>
    ))}
    <mesh position={[0, 0.85, 0.15]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.03, 0.03, 3.1, 8]} />
      <meshStandardMaterial color="#9e1b26" roughness={0.85} />
    </mesh>

    {/* Lampu sorot dari langit-langit */}
    <mesh position={[0, 4.9, -1.2]}>
      <coneGeometry args={[0.35, 0.45, 12]} />
      <meshStandardMaterial color="#2a2d36" roughness={0.5} />
    </mesh>
    <pointLight position={[0, 4.3, -1.0]} intensity={14} color="#fff2cc" distance={10} />
  </group>
);

/* ------------------------------------------------------------------ */
/* L2: BALAI DEWAN BOLOGNA (RUANG RAPAT PERANG 1325)                   */
/* ------------------------------------------------------------------ */
export const SetBalaiDewan: React.FC = () => (
  <group>
    {/* Lantai ubin terakota Italia */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial color="#b86b4b" roughness={0.85} />
    </mesh>
    {/* Dinding batu bata hangat */}
    <mesh position={[0, 3.6, -4.2]} receiveShadow>
      <boxGeometry args={[18, 7.5, 0.4]} />
      <meshStandardMaterial color="#e6cfa8" roughness={0.9} />
    </mesh>
    {/* Pilar bata merah khas Bologna */}
    {[-3.0, 3.0].map((x) => (
      <mesh key={x} position={[x, 3.2, -3.85]} castShadow receiveShadow>
        <boxGeometry args={[0.75, 6.4, 0.75]} />
        <meshStandardMaterial color="#a44432" roughness={0.85} />
      </mesh>
    ))}
    {/* Jendela tinggi melengkung di tengah belakang (cahaya langit) */}
    <mesh position={[0, 3.9, -3.95]}>
      <boxGeometry args={[2.0, 2.8, 0.1]} />
      <meshStandardMaterial color="#bfe0f7" emissive="#8bc4ec" emissiveIntensity={0.35} />
    </mesh>
    {/* Spanduk salib merah Bologna (kiri & kanan jendela) */}
    {[-1.75, 1.75].map((x) => (
      <group key={x} position={[x, 4.0, -3.92]}>
        <mesh>
          <boxGeometry args={[0.95, 2.1, 0.05]} />
          <meshStandardMaterial color="#f5efe2" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0, 0.04]}>
          <boxGeometry args={[0.24, 1.9, 0.04]} />
          <meshStandardMaterial color="#b51f29" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.25, 0.04]}>
          <boxGeometry args={[0.85, 0.24, 0.04]} />
          <meshStandardMaterial color="#b51f29" roughness={0.8} />
        </mesh>
      </group>
    ))}

    {/* Rak gulungan perkamen di sisi kiri */}
    <group position={[-2.2, 0, -2.9]}>
      <mesh position={[0, 1.4, 0]} castShadow>
        <boxGeometry args={[1.1, 2.8, 0.5]} />
        <meshStandardMaterial color="#6e4726" roughness={0.85} />
      </mesh>
      {[0.7, 1.35, 2.0].map((y) => (
        <mesh key={y} position={[0, y, 0.16]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.07, 0.07, 0.85, 8]} />
          <meshStandardMaterial color="#ede0be" roughness={0.9} />
        </mesh>
      ))}
    </group>

    {/* Meja peta perang kayu panjang */}
    <group position={[0, 0, -0.9]}>
      <mesh position={[0, 1.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.4, 0.18, 2.1]} />
        <meshStandardMaterial color="#734824" roughness={0.8} />
      </mesh>
      {[
        [-1.9, -0.8],
        [1.9, -0.8],
        [-1.9, 0.8],
        [1.9, 0.8],
      ].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 0.55, lz]} castShadow>
          <boxGeometry args={[0.2, 1.1, 0.2]} />
          <meshStandardMaterial color="#593619" roughness={0.85} />
        </mesh>
      ))}
      {/* Peta perkamen Emilia-Romagna di atas meja */}
      <mesh position={[0, 1.26, 0]} receiveShadow>
        <boxGeometry args={[3.5, 0.03, 1.65]} />
        <meshStandardMaterial color="#f0dfba" roughness={0.95} />
      </mesh>
      {/* Wilayah Modena (biru) vs Bologna (merah) di peta */}
      <mesh position={[-0.9, 1.28, 0]}>
        <boxGeometry args={[1.2, 0.02, 1.2]} />
        <meshStandardMaterial color="#3c6ab0" roughness={0.9} />
      </mesh>
      <mesh position={[0.9, 1.28, 0]}>
        <boxGeometry args={[1.2, 0.02, 1.2]} />
        <meshStandardMaterial color="#c43b3b" roughness={0.9} />
      </mesh>
      {/* Bidak Kastil Monteveglio di tengah */}
      <mesh position={[-0.1, 1.48, 0.1]} castShadow>
        <boxGeometry args={[0.32, 0.36, 0.32]} />
        <meshStandardMaterial color="#d9c6a0" roughness={0.8} />
      </mesh>
      <mesh position={[-0.1, 1.72, 0.1]}>
        <coneGeometry args={[0.24, 0.24, 4]} />
        <meshStandardMaterial color="#2554a3" roughness={0.75} />
      </mesh>
      {/* Kandelabra lilin di ujung meja */}
      <group position={[1.7, 1.25, -0.5]}>
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.04, 0.14, 0.5, 10]} />
          <meshStandardMaterial color="#cfa032" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.62, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.28, 8]} />
          <meshStandardMaterial color="#fff8e0" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.82, 0]}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshStandardMaterial color="#ffbb33" emissive="#ff9900" emissiveIntensity={1.2} />
        </mesh>
      </group>
    </group>
  </group>
);

/* ------------------------------------------------------------------ */
/* L3: BUKIT & PADANG ZAPPOLINO (MEDAN PERANG SENJA)                   */
/* ------------------------------------------------------------------ */
export const SetBukitZappolino: React.FC = () => (
  <group>
    {/* Tanah padang rumput senja */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial color="#7a8c47" roughness={0.95} />
    </mesh>
    {/* Jalan tanah melintas medan */}
    <mesh position={[0, 0.02, 0.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[30, 3.2]} />
      <meshStandardMaterial color="#b39365" roughness={0.95} />
    </mesh>
    {/* Perbukitan hijau di belakang */}
    <mesh position={[-4.5, 0.8, -9]} scale={[6, 2.2, 4]} receiveShadow>
      <sphereGeometry args={[1.4, 16, 12]} />
      <meshStandardMaterial color="#677c3c" roughness={0.95} />
    </mesh>
    <mesh position={[4.8, 1.0, -10]} scale={[7, 2.6, 4.5]} receiveShadow>
      <sphereGeometry args={[1.5, 16, 12]} />
      <meshStandardMaterial color="#5b6e35" roughness={0.95} />
    </mesh>
    {/* Benteng batu Zappolino di puncak bukit */}
    <group position={[2.2, 2.8, -9.2]}>
      <mesh castShadow>
        <boxGeometry args={[2.2, 1.8, 1.4]} />
        <meshStandardMaterial color="#c4b292" roughness={0.85} />
      </mesh>
      <mesh position={[-0.9, 1.2, 0]}>
        <boxGeometry args={[0.7, 1.3, 0.7]} />
        <meshStandardMaterial color="#b39f7e" roughness={0.85} />
      </mesh>
    </group>
    {/* Tenda komando Modena (biru-emas) di kiri */}
    <group position={[-2.6, 0, -4.5]}>
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[1.1, 1.3, 2.2, 8]} />
        <meshStandardMaterial color="#254c8a" roughness={0.85} />
      </mesh>
      <mesh position={[0, 2.65, 0]} castShadow>
        <coneGeometry args={[1.35, 1.1, 8]} />
        <meshStandardMaterial color="#e0b238" roughness={0.8} />
      </mesh>
    </group>
    {/* Tenda komando Bologna (merah-putih) di kanan */}
    <group position={[2.6, 0, -4.5]}>
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[1.1, 1.3, 2.2, 8]} />
        <meshStandardMaterial color="#b5262e" roughness={0.85} />
      </mesh>
      <mesh position={[0, 2.65, 0]} castShadow>
        <coneGeometry args={[1.35, 1.1, 8]} />
        <meshStandardMaterial color="#f5efe2" roughness={0.8} />
      </mesh>
    </group>
    {/* Panji perang Modena & Bologna */}
    {[-1.5, 1.5].map((x, idx) => (
      <group key={x} position={[x, 0, -2.8]}>
        <mesh position={[0, 2.0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 4.0, 6]} />
          <meshStandardMaterial color="#593c22" roughness={0.85} />
        </mesh>
        <mesh position={[0.45, 3.4, 0]}>
          <boxGeometry args={[0.9, 0.6, 0.04]} />
          <meshStandardMaterial color={idx === 0 ? "#24529e" : "#c4232d"} roughness={0.8} />
        </mesh>
      </group>
    ))}
  </group>
);

/* ------------------------------------------------------------------ */
/* L4: GERBANG PORTA SAN FELICE + SUMUR BATU BOLOGNA                   */
/* ------------------------------------------------------------------ */
export const SetGerbangBologna: React.FC<{ showWellBucket?: boolean }> = ({ showWellBucket = true }) => (
  <group>
    {/* Jalan batu cobblestone */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial color="#b5a58d" roughness={0.95} />
    </mesh>
    {/* Tembok kota bata merah Bologna */}
    <group position={[0, 0, -3.5]}>
      <mesh position={[0, 2.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[14, 5.2, 1.2]} />
        <meshStandardMaterial color="#a64835" roughness={0.9} />
      </mesh>
      {/* Gerbang kayu besar tertutup rapat */}
      <mesh position={[0, 1.65, 0.64]} castShadow>
        <boxGeometry args={[2.5, 3.3, 0.2]} />
        <meshStandardMaterial color="#5e3a1e" roughness={0.85} />
      </mesh>
      {/* Lengkungan batu di atas gerbang */}
      <mesh position={[0, 3.45, 0.66]}>
        <boxGeometry args={[2.9, 0.4, 0.24]} />
        <meshStandardMaterial color="#d4c2a3" roughness={0.85} />
      </mesh>
      {/* Gigi benteng (crenellations) di atas tembok */}
      {[-4.5, -3.3, -2.1, -0.9, 0.3, 1.5, 2.7, 3.9].map((bx) => (
        <mesh key={bx} position={[bx, 5.55, 0.25]} castShadow>
          <boxGeometry args={[0.68, 0.75, 0.5]} />
          <meshStandardMaterial color="#963d2c" roughness={0.9} />
        </mesh>
      ))}
    </group>

    {/* Sumur batu tua beratap kayu di kanan depan */}
    <group position={[1.45, 0, -0.4]}>
      {/* Dinding sumur batu */}
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.72, 0.78, 1.1, 14]} />
        <meshStandardMaterial color="#9e9587" roughness={0.95} />
      </mesh>
      {/* Lubang air gelap */}
      <mesh position={[0, 1.08, 0]}>
        <cylinderGeometry args={[0.56, 0.56, 0.06, 14]} />
        <meshStandardMaterial color="#1f2c36" roughness={0.6} />
      </mesh>
      {/* Dua tiang penyangga atap sumur */}
      {[-0.64, 0.64].map((tx) => (
        <mesh key={tx} position={[tx, 1.5, 0]} castShadow>
          <boxGeometry args={[0.12, 1.9, 0.12]} />
          <meshStandardMaterial color="#6b4423" roughness={0.85} />
        </mesh>
      ))}
      {/* Poros katrol kayu */}
      <mesh position={[0, 1.95, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.06, 0.06, 1.32, 10]} />
        <meshStandardMaterial color="#4f3218" roughness={0.85} />
      </mesh>
      {/* Atap pelana genteng merah */}
      <mesh position={[0, 2.55, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.18, 0.75, 4]} />
        <meshStandardMaterial color="#9e3d28" roughness={0.85} />
      </mesh>
      {showWellBucket && <WoodenBucket3D position={[0, 1.12, 0]} scale={0.95} withRope />}
    </group>

    {/* Tong kayu & bendera Modena di kiri */}
    <mesh position={[-2.1, 0.42, -1.2]} castShadow>
      <cylinderGeometry args={[0.32, 0.3, 0.84, 12]} />
      <meshStandardMaterial color="#7d4f28" roughness={0.85} />
    </mesh>
  </group>
);
