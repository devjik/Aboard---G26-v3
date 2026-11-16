# 3D assets

Place your hero 3D model here as `hero-bus.glb` (glTF binary, < 4MB recommended for web).

The landing page currently renders a static image fallback. When `hero-bus.glb` exists, it will be lazy-loaded via React Three Fiber (`@react-three/fiber` + `@react-three/drei`) on the landing hero only, suspended behind a `<Suspense>` boundary with the static image as fallback.

Spline scenes are also supported: export your Spline scene as a `.splinecode` file and reference its URL in `src/lib/animations/registry.ts`.
