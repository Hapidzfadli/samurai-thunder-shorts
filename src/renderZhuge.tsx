import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { Zhuge } from './Zhuge';
import timingJson from './zhuge_timing.json';
import type { ZhugeTiming } from './zhuge/timing';

const timing = timingJson as unknown as ZhugeTiming;

const Root: React.FC = () => (
  <Composition
    id="ZhugeLiangKotaKosong"
    component={Zhuge}
    width={1080}
    height={1920}
    fps={timing.fps}
    durationInFrames={timing.totalFrames}
    defaultProps={{ withAudio: true, timing }}
  />
);

registerRoot(Root);
