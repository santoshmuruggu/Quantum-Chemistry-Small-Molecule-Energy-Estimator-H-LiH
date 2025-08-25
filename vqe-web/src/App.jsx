import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import * as THREE from "three";

import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  AccumulativeShadows,
  RandomizedLight,
  Trail,
  Environment,
  RoundedBox,
} from "@react-three/drei";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

/* --------------------- utils --------------------- */
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const obj = {};
    headers.forEach((h, i) => {
      const v = (cols[i] ?? "").trim();
      const n = Number(v);
      obj[h] = Number.isFinite(n) ? n : v;
    });
    return obj;
  });
}
async function fetchCSV(path) {
  try {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return parseCSV(await res.text());
  } catch {
    return null;
  }
}
function findMinimumRow(rows, xKey, yKey) {
  if (!rows || !rows.length) return null;
  let best = rows[0];
  for (const r of rows) if (r[yKey] < best[yKey]) best = r;
  return best;
}

/* --------------------- 3D scene --------------------- */
function Electron({
  center = [0, 0, 0],
  a = 0.5,
  b = 0.28,
  speed = 1,
  phase = 0,
}) {
  // Elliptical, slightly precessing orbital with a luminescent trail
  const ref = useRef();
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed + phase;
    const wobble = 0.08 * Math.sin(t * 0.45 + phase);
    const x = center[0] + (a + wobble) * Math.cos(t);
    const y = center[1] + 0.12 * Math.sin(2 * t + phase);
    const z = center[2] + (b + wobble) * Math.sin(t);
    ref.current.position.set(x, y, z);
  });
  return (
    <Trail
      width={0.02}
      color="#7dd3fc"
      length={8}
      decay={0.9}
      attenuation={(t) => t}
    >
      <mesh ref={ref} castShadow>
        <sphereGeometry args={[0.055, 24, 24]} />
        <meshStandardMaterial
          color="#7dd3fc"
          emissive="#1d4ed8"
          emissiveIntensity={1.3}
          metalness={0.4}
          roughness={0.2}
        />
      </mesh>
    </Trail>
  );
}

function Proton({ position = [0, 0, 0] }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <sphereGeometry args={[0.18, 48, 48]} />
      <meshStandardMaterial
        color="#ef4444"
        emissive="#7f1d1d"
        emissiveIntensity={1.2}
        roughness={0.4}
      />
    </mesh>
  );
}

function Bond({ a = [-0.4, 0, 0], b = [0.4, 0, 0] }) {
  // cylinder between points a & b
  const v = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(...v);
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];

  // orientation via lookAt trick
  const ref = useRef();
  useEffect(() => {
    const dir = new THREE.Vector3(v[0], v[1], v[2]).normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir,
    );
    ref.current.setRotationFromQuaternion(quat);
  }, [len]);
  return (
    <group position={mid}>
      <mesh ref={ref} receiveShadow>
        <cylinderGeometry args={[0.04, 0.04, len, 32]} />
        <meshStandardMaterial
          color="#eab308"
          transparent
          opacity={0.22}
          roughness={0.7}
        />
      </mesh>
    </group>
  );
}

function H2Molecule({ bondLength = 0.735 }) {
  const half = bondLength / 2;
  const left = [-half, 0, 0];
  const right = [half, 0, 0];
  const mid = [0, 0, 0];

  return (
    <>
      {/* key lights */}
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[3, 3, 2]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-2, 1.5, -1.5]} intensity={0.6} />

      {/* actors */}
      <Proton position={left} />
      <Proton position={right} />
      <Bond a={left} b={right} />

      {/* bonding electrons */}
      <Electron center={mid} a={0.42} b={0.28} speed={1.25} phase={0} />
      <Electron
        center={mid}
        a={0.52}
        b={0.35}
        speed={0.95}
        phase={Math.PI / 2}
      />

      {/* ground / soft shadows */}
      <AccumulativeShadows
        temporal
        frames={60}
        alphaTest={0.9}
        scale={4}
        color="#0a0a0a"
        position={[0, -0.35, 0]}
      >
        <RandomizedLight
          amount={8}
          radius={1.2}
          ambient={0.5}
          intensity={1}
          position={[2, 3, 2]}
        />
      </AccumulativeShadows>

      {/* subtle environment reflections */}
      <Environment preset="city" />
      <OrbitControls enablePan={false} minDistance={1.2} maxDistance={4} />
    </>
  );
}

/* --------------------- small UI blocks --------------------- */
function Stat({ label, value, hint }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value ?? "—"}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}

function FileLoader({ label, onData }) {
  const onChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        onData(parseCSV(String(reader.result || "")));
      } catch (err) {
        alert("CSV parse failed: " + err);
      }
    };
    reader.readAsText(file);
  };
  return (
    <label className="upload">
      Upload {label} CSV
      <input type="file" accept=".csv" onChange={onChange} />
    </label>
  );
}

/* --------------------- main app --------------------- */
export default function App() {
  const [bond, setBond] = useState(0.735);
  const [h2, setH2] = useState(null);
  const [lih, setLih] = useState(null);
  const [noisy, setNoisy] = useState(null);

  useEffect(() => {
    (async () => {
      const [h2d, lihd, nz] = await Promise.all([
        fetchCSV("results/csv/pec_h2_sto3g.csv"),
        fetchCSV("results/csv/pec_lih_sto3g.csv"),
        fetchCSV("results/csv/h2_noisy_runs.csv"),
      ]);
      if (h2d) setH2(h2d);
      if (lihd) setLih(lihd);
      if (nz) setNoisy(nz);
    })();
  }, []);

  const h2Min = useMemo(
    () => findMinimumRow(h2, "bond_length_angstrom", "vqe_energy_ha"),
    [h2],
  );
  const lihMin = useMemo(
    () => findMinimumRow(lih, "bond_length_angstrom", "vqe_energy_ha"),
    [lih],
  );

  const ghRepo =
    "https://github.com/santoshmuruggu/Quantum-Chemistry-Small-Molecule-Energy-Estimator-H-LiH";

  return (
    <div>
      {/* Header */}
      <header className="header">
        <div className="brand">
          <div className="brand-logo" />
          <div className="brand-titles">
            <div className="brand-sub">Hackathon Project</div>
            <h1 className="brand-title">
              Quantum Chemistry — Small Molecule Energy (VQE)
            </h1>
          </div>
        </div>
        <div className="links">
          <a href={ghRepo} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href="results/figs/pec_h2.png" target="_blank" rel="noreferrer">
            H₂ PNG
          </a>
          <a href="results/figs/pec_lih.png" target="_blank" rel="noreferrer">
            LiH PNG
          </a>
        </div>
      </header>

      <main className="container">
        {/* top section */}
        <section className="grid2">
          <div className="card">
            <div className="card-head">
              <h2>Interactive H₂ Molecule</h2>
              <div className="muted">
                Bond length: <span className="mono">{bond.toFixed(3)} Å</span>
              </div>
            </div>
            <div className="canvas-wrap">
              <Canvas
                shadows
                dpr={[1, 2]}
                camera={{ position: [0, 0.65, 2.1], fov: 45 }}
              >
                <H2Molecule bondLength={bond} />
              </Canvas>
            </div>
            <input
              type="range"
              min={0.4}
              max={2.4}
              step={0.005}
              value={bond}
              onChange={(e) => setBond(parseFloat(e.target.value))}
            />
            <p className="note">
              Adjust bond length; electrons are animated to evoke bonding
              (visual only).
            </p>
          </div>

          <div className="col">
            <div className="stats">
              <Stat
                label="H₂ Equilibrium (from PEC)"
                value={
                  h2Min ? `${h2Min.bond_length_angstrom.toFixed(3)} Å` : "—"
                }
                hint={
                  h2Min ? `${h2Min.vqe_energy_ha.toFixed(6)} Ha` : "Load H₂ CSV"
                }
              />
              <Stat
                label="LiH Equilibrium (from PEC)"
                value={
                  lihMin ? `${lihMin.bond_length_angstrom.toFixed(3)} Å` : "—"
                }
                hint={
                  lihMin
                    ? `${lihMin.vqe_energy_ha.toFixed(6)} Ha`
                    : "Load LiH CSV"
                }
              />
            </div>

            <div className="card tight">
              <div className="muted" style={{ marginBottom: 8 }}>
                Load CSVs (optional)
              </div>
              <div className="uploads">
                <FileLoader label="H₂ PEC (pec_h2_sto3g.csv)" onData={setH2} />
                <FileLoader
                  label="LiH PEC (pec_lih_sto3g.csv)"
                  onData={setLih}
                />
                <FileLoader
                  label="Noisy Runs (h2_noisy_runs.csv)"
                  onData={setNoisy}
                />
              </div>
              <p className="note">
                If files live under <code>public/results/csv/</code>, they
                auto-load.
              </p>
            </div>

            <div className="card tight">
              <h3>Deliverables</h3>
              <ul className="deliv">
                <li>
                  PEC Plots:{" "}
                  <a
                    href="results/figs/pec_h2.png"
                    target="_blank"
                    rel="noreferrer"
                  >
                    H₂
                  </a>
                  ,{" "}
                  <a
                    href="results/figs/pec_lih.png"
                    target="_blank"
                    rel="noreferrer"
                  >
                    LiH
                  </a>
                </li>
                <li>
                  CSVs: <code>results/csv/pec_h2_sto3g.csv</code>,{" "}
                  <code>results/csv/pec_lih_sto3g.csv</code>
                </li>
                <li>
                  Noisy log: <code>results/csv/h2_noisy_runs.csv</code>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* charts */}
        <section className="grid2">
          <div className="card">
            <div className="card-head">
              <h2>H₂ Potential Energy Curve</h2>
              <div className="muted">Source: pec_h2_sto3g.csv</div>
            </div>
            <div className="chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={h2 || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="bond_length_angstrom"
                    tick={{ fill: "#a1a1aa" }}
                  />
                  <YAxis tick={{ fill: "#a1a1aa" }} />
                  <Tooltip
                    contentStyle={{
                      background: "#18181b",
                      border: "1px solid #3f3f46",
                      color: "#e4e4e7",
                    }}
                  />
                  <Legend wrapperStyle={{ color: "#d4d4d8" }} />
                  <Line
                    type="monotone"
                    dataKey="vqe_energy_ha"
                    dot={false}
                    strokeWidth={2}
                    name="VQE"
                  />
                  <Line
                    type="monotone"
                    dataKey="exact_energy_ha"
                    dot={false}
                    strokeDasharray="4 2"
                    strokeWidth={2}
                    name="Exact"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h2>LiH Potential Energy Curve</h2>
              <div className="muted">Source: pec_lih_sto3g.csv</div>
            </div>
            <div className="chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lih || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="bond_length_angstrom"
                    tick={{ fill: "#a1a1aa" }}
                  />
                  <YAxis tick={{ fill: "#a1a1aa" }} />
                  <Tooltip
                    contentStyle={{
                      background: "#18181b",
                      border: "1px solid #3f3f46",
                      color: "#e4e4e7",
                    }}
                  />
                  <Legend wrapperStyle={{ color: "#d4d4d8" }} />
                  <Line
                    type="monotone"
                    dataKey="vqe_energy_ha"
                    dot={false}
                    strokeWidth={2}
                    name="VQE"
                  />
                  <Line
                    type="monotone"
                    dataKey="exact_energy_ha"
                    dot={false}
                    strokeDasharray="4 2"
                    strokeWidth={2}
                    name="Exact"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* noisy */}
        <section className="card">
          <div className="card-head">
            <h2>H₂ @ 0.735 Å — Noisy Δ vs Restart</h2>
            <div className="muted">Source: h2_noisy_runs.csv</div>
          </div>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={noisy || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="restart" tick={{ fill: "#a1a1aa" }} />
                <YAxis tick={{ fill: "#a1a1aa" }} />
                <Tooltip
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid #3f3f46",
                    color: "#e4e4e7",
                  }}
                />
                <Legend wrapperStyle={{ color: "#d4d4d8" }} />
                <Bar dataKey="delta_ha" name="Δ (Ha)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {noisy && noisy.length > 0 && (
            <div className="muted small">
              Shots: <code>{noisy[0].shots}</code> · R:{" "}
              <code>{noisy[0].R_angstrom}</code> Å
            </div>
          )}
        </section>

        <footer className="footer">
          Built with Qiskit + PySCF · Visuals: React Three Fiber & Recharts ·
          Dark mode forever 🌑
        </footer>
      </main>
    </div>
  );
}
