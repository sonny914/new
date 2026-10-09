// The preset registry. A project names presets by id; the validator checks params against each
// preset's schema; the catalog (docs/PRESET_CATALOG.md) is generated from these definitions.
import type {PresetDef} from '../engine/types';
import {BrandLockup} from './brand/BrandLockup';
import {Accent} from './geometry/Accent';
import {Accumulation} from './geometry/Accumulation';
import {GridAssembly} from './geometry/GridAssembly';
import {LineDraw} from './geometry/LineDraw';
import {DirectionalWipe} from './transitions/DirectionalWipe';
import {KineticHeadline} from './typography/KineticHeadline';
import {MaskedTextReveal} from './typography/MaskedTextReveal';
import {WordStack} from './typography/WordStack';
import {Captions} from './typography/Captions';
import {AppSwarm} from './geometry/AppSwarm';
import {Footage} from './media/Footage';
import {TaskDemo} from './media/TaskDemo';

const list = [KineticHeadline, MaskedTextReveal, WordStack, Captions, LineDraw, GridAssembly, Accumulation, AppSwarm, Accent, DirectionalWipe, BrandLockup, Footage, TaskDemo] as unknown as PresetDef[];

export const PRESETS: Record<string, PresetDef> = Object.fromEntries(list.map((p) => [p.id, p]));
