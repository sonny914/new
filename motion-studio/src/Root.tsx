// Studio and render entry. Every projects/<id>/project.json becomes a composition named by its
// id, and "Project" renders whatever config the CLI passes in as input props.
import React from 'react';
import {Composition, type CalculateMetadataFunction} from 'remotion';
import {ProjectVideo, type ProjectProps} from './engine/composer';
import {resolveFormat, type FormatInput} from './engine/formats';
import {resolveTime} from './engine/time';
import type {ProjectInput} from './engine/config/schema';
import {PRESETS} from './presets';
import {exampleProject} from './presets/examples';

const ctx = require.context('../projects', true, /^\.\/[a-z0-9-]+\/project\.json$/);
const projects = ctx.keys().map((k) => ({folder: k.split('/')[1], config: ctx<ProjectInput>(k)}));

export const metadataFor = (config: ProjectInput) => {
  const fps = config.fps ?? 30;
  const format = resolveFormat((config.format ?? 'story') as FormatInput);
  let duration = 30;
  try {
    duration = Math.max(1, resolveTime(config.duration, {fps, duration: 0, scenes: {}}));
  } catch {
    // An invalid duration is reported by the validator; render a short error card meanwhile.
  }
  return {fps, width: format.width, height: format.height, durationInFrames: duration};
};

const calculateMetadata: CalculateMetadataFunction<ProjectProps> = ({props}) => metadataFor(props.config);

export const Root: React.FC = () => (
  <>
    {projects.map(({folder, config}) => (
      <Composition
        key={folder}
        id={config.id}
        component={ProjectVideo}
        defaultProps={{config, assetBase: folder} satisfies ProjectProps}
        calculateMetadata={calculateMetadata}
        {...metadataFor(config)}
      />
    ))}
    {Object.values(PRESETS).map((def) => {
      const config = exampleProject(def);
      return (
        <Composition
          key={def.id}
          id={config.id}
          component={ProjectVideo}
          defaultProps={{config, assetBase: '.'} satisfies ProjectProps}
          calculateMetadata={calculateMetadata}
          {...metadataFor(config)}
        />
      );
    })}
    {projects.length ? (
      <Composition
        id="Project"
        component={ProjectVideo}
        defaultProps={{config: projects[0].config, assetBase: projects[0].folder} satisfies ProjectProps}
        calculateMetadata={calculateMetadata}
        {...metadataFor(projects[0].config)}
      />
    ) : null}
  </>
);
