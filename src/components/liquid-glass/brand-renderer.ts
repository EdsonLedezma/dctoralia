import {
  clock,
  effect,
  frameLoop,
  init,
  sampler,
  surface,
  texture,
  type Gpu,
  type Texture,
} from "vgpu";
import { prepareShader } from "@vgpu/wgsl/prepare";

const shader = prepareShader(
  `
struct Params { time: f32, aspect: f32, dark: f32, padding: f32 }
@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var logo: texture_2d<f32>;
@group(0) @binding(2) var linear: sampler;
fn mask(uv: vec2f) -> f32 { return textureSampleLevel(logo, linear, uv, 0.0).a; }
@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let p = (uv - 0.5) * vec2f(params.aspect, 1.0);
  let coord = p / 0.92 + 0.5;
  let ripple = vec2f(sin(p.y * 7.0 + params.time * 0.7), cos(p.x * 6.0 - params.time * 0.55)) * 0.002;
  let q = coord + ripple;
  let a = mask(q);
  let e = 0.006;
  let dx = mask(q + vec2f(e, 0.0)) - mask(q - vec2f(e, 0.0));
  let dy = mask(q + vec2f(0.0, e)) - mask(q - vec2f(0.0, e));
  let normal = normalize(vec3f(-dx * 5.0, -dy * 5.0, 0.38));
  let light = normalize(vec3f(cos(params.time * 0.32) * 0.8, sin(params.time * 0.28) * 0.55 - 0.35, 0.7));
  let specular = pow(max(dot(normal, light), 0.0), 24.0);
  let sweepAxis = normalize(vec2f(cos(params.time * 0.2), sin(params.time * 0.2)));
  let sweep = exp(-pow((dot(p, sweepAxis) - sin(params.time * 0.38) * 0.52) * 15.0, 2.0));
  let edge = clamp(length(vec2f(dx, dy)) * 3.0, 0.0, 1.0);
  let bands = 0.5 + 0.5 * sin(p.x * 5.5 + p.y * 4.0 + params.time * 1.15);
  let metal = clamp(0.14 + bands * 0.57 + sweep * 0.32 + specular * edge * 0.55, 0.0, 1.0);
  let shade = mix(0.12 + metal * 0.72, 0.48 + metal * 0.48, params.dark);
  let rim = edge * (0.18 + specular * 0.82);
  let alpha = clamp(a * 0.9 + rim * 0.2, 0.0, 1.0);
  let silver = clamp(shade + rim * 0.24 + sweep * a * 0.14, 0.0, 1.0);
  return vec4f(vec3f(silver) * alpha, alpha);
}
`,
  "dopilot-hero-glass.wgsl",
);

/** Samples the exact official SVG alpha; no alternate logo is redrawn in WGSL. */
export function createBrandRenderer({
  canvas,
  dark,
  onError,
}: {
  canvas: HTMLCanvasElement;
  dark: boolean;
  onError: () => void;
}) {
  let disposed = false;
  let gpu: Gpu | undefined;
  let logo: Texture | undefined;
  let loop: { stop: () => void } | undefined;
  let cleanupError: (() => void) | undefined;
  let cleanupResize: (() => void) | undefined;
  let disposeEffect: (() => void) | undefined;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    loop?.stop();
    cleanupResize?.();
    cleanupError?.();
    disposeEffect?.();
    logo?.destroy();
    gpu?.dispose();
  };
  const ready = (async () => {
    try {
      const image = new Image();
      image.src = "/dopilot-icono.svg";
      await image.decode();
      if (disposed) return;
      const next = await init();
      if (disposed) {
        next.dispose();
        return;
      }
      gpu = next;
      const fail = () => {
        if (!disposed) {
          dispose();
          onError();
        }
      };
      cleanupError = gpu.onError(fail);
      void gpu.lost.then(fail);
      const source = new OffscreenCanvas(768, 768);
      const context = source.getContext("2d");
      if (!context) throw new Error("Logo mask unavailable");
      context.drawImage(image, 0, 0, 768, 768);
      logo = texture(gpu, {
        kind: "2d",
        size: [768, 768],
        format: "rgba8unorm",
        usage: ["texture_binding", "copy_dst", "render_attachment"],
        label: "dopilot-official-mark",
      });
      gpu.device.gpu.queue.copyExternalImageToTexture(
        { source },
        { texture: logo.gpu },
        [768, 768],
      );
      const output = surface(gpu, canvas, {
        dpr: [1, 1.5],
        alphaMode: "premultiplied",
        clearColor: [0, 0, 0, 0],
      });
      const timeline = clock(gpu);
      const glass = effect(gpu, shader, {
        label: "dopilot-liquid-glass",
        blend: "premultiplied",
        set: {
          logo,
          linear: sampler(gpu, { minFilter: "linear", magFilter: "linear" }),
          params: { time: 0, aspect: 1, dark: dark ? 1 : 0, padding: 0 },
        },
      });
      disposeEffect = () => glass.dispose();
      const update = () =>
        glass.set({
          params: {
            time: timeline.time,
            aspect: output.size[0] / output.size[1],
            dark: dark ? 1 : 0,
            padding: 0,
          },
        });
      cleanupResize = output.onResize(update);
      await glass.compile(output);
      if (disposed) return;
      let frames = 0;
      loop = frameLoop(gpu, (frame) => {
        update();
        frame.pass(output, glass);
        if (++frames === 1) canvas.dataset.gpuFrame = "1";
      });
    } catch (error) {
      dispose();
      throw error;
    }
  })();
  return { ready, dispose };
}
