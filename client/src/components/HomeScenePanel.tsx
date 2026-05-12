import { motion } from 'motion/react';
import {
  Home, Sun, LayoutGrid, Ruler, Camera, ChevronsUp, ChevronsDownUp, MapPin,
  Loader2, Zap,
} from 'lucide-react';
import type {
  AddressRecord, CameraPreset, OverlayName, Project,
} from '@solar3d/shared';

interface Props {
  address: AddressRecord;
  overlays: Record<OverlayName, boolean>;
  preset: CameraPreset;
  timeOfDayHours: number;
  ionTokenAvailable: boolean;
  project: Project | null;
  projectError: string | null;
  onToggleOverlay: (name: OverlayName, enabled: boolean) => void;
  onSetPreset: (p: CameraPreset) => void;
  onSetTimeOfDay: (h: number) => void;
  onRefocus: () => void;
  onChangeAddress: () => void;
}

export default function HomeScenePanel({
  address, overlays, preset, timeOfDayHours, ionTokenAvailable,
  project, projectError,
  onToggleOverlay, onSetPreset, onSetTimeOfDay, onRefocus, onChangeAddress,
}: Props) {
  const layoutLoading = !project && !projectError;
  const panelsLabel = project
    ? `Solar panels (${project.panelLayout.totalPanelCount})`
    : layoutLoading
      ? 'Solar panels (loading…)'
      : 'Solar panels (mock)';
  return (
    <motion.div
      initial={{ x: 24, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="absolute top-4 right-4 w-80 max-h-[calc(100%-2rem)] overflow-y-auto rounded-2xl border bg-card/95 backdrop-blur-md shadow-2xl p-5 space-y-5"
    >
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <MapPin className="h-4 w-4 text-primary" />
            Current Home
          </div>
          <button
            onClick={onChangeAddress}
            className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            change
          </button>
        </div>
        <div className="text-sm font-medium leading-snug">{address.fullAddress}</div>
        <div className="text-[11px] font-mono text-muted-foreground mt-1">
          {address.location.lat.toFixed(5)}, {address.location.lng.toFixed(5)}
        </div>
      </div>

      {!ionTokenAvailable && (
        <div className="rounded-lg border border-amber-300/40 bg-amber-50/60 dark:bg-amber-900/20 p-3 text-xs text-amber-900 dark:text-amber-100">
          Add a free Cesium ion token to <code className="font-mono">.env</code>
          {' '}as <code className="font-mono">VITE_CESIUM_ION_TOKEN</code> to
          enable terrain + 3D buildings.
        </div>
      )}

      {project && (
        <div className="rounded-lg border bg-background/60 p-3 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-primary" /> System estimate
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <span className="text-muted-foreground">Panels</span>
            <span className="font-medium text-right">{project.panelLayout.totalPanelCount}</span>
            <span className="text-muted-foreground">Capacity</span>
            <span className="font-medium text-right">{project.panelLayout.totalCapacityKw.toFixed(2)} kW</span>
            <span className="text-muted-foreground">Annual</span>
            <span className="font-medium text-right">
              {Math.round(project.energyEstimate.acAnnual).toLocaleString()} kWh
            </span>
          </div>
        </div>
      )}

      {projectError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          Layout fetch failed: {projectError}
        </div>
      )}

      <Section title="Overlays">
        <ToggleRow
          icon={<Home className="h-4 w-4" />} label="Roof outline"
          on={overlays.roof} onChange={(v) => onToggleOverlay('roof', v)}
        />
        <ToggleRow
          icon={layoutLoading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <LayoutGrid className="h-4 w-4" />}
          label={panelsLabel}
          on={overlays.panels}
          onChange={(v) => onToggleOverlay('panels', v)}
        />
        <ToggleRow
          icon={<Ruler className="h-4 w-4" />} label="Measurements"
          on={overlays.measurements} onChange={(v) => onToggleOverlay('measurements', v)}
        />
      </Section>

      <Section title="Camera">
        <div className="grid grid-cols-2 gap-2">
          <PresetButton
            active={preset === 'top-down'} onClick={() => onSetPreset('top-down')}
            icon={<ChevronsDownUp className="h-3.5 w-3.5" />} label="Top-down"
          />
          <PresetButton
            active={preset === 'oblique-front-left'} onClick={() => onSetPreset('oblique-front-left')}
            icon={<Camera className="h-3.5 w-3.5" />} label="Front-left"
          />
          <PresetButton
            active={preset === 'oblique-back-right'} onClick={() => onSetPreset('oblique-back-right')}
            icon={<Camera className="h-3.5 w-3.5" />} label="Back-right"
          />
          <PresetButton
            active={preset === 'street'} onClick={() => onSetPreset('street')}
            icon={<ChevronsUp className="h-3.5 w-3.5" />} label="Street"
          />
        </div>
        <button
          onClick={onRefocus}
          className="w-full mt-2 h-9 text-sm rounded-md border bg-background hover:bg-muted transition-colors flex items-center justify-center gap-1.5"
        >
          <Home className="h-4 w-4" /> Focus home
        </button>
      </Section>

      <Section title={`Time of day · ${formatHour(timeOfDayHours)}`}>
        <div className="flex items-center gap-2">
          <Sun className="h-4 w-4 text-amber-500 flex-shrink-0" />
          <input
            type="range"
            min={0} max={23.5} step={0.5}
            value={timeOfDayHours}
            onChange={(e) => onSetTimeOfDay(parseFloat(e.target.value))}
            className="flex-1 accent-primary"
          />
        </div>
      </Section>
    </motion.div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      {children}
    </div>
  );
}

function ToggleRow({
  icon, label, on, onChange,
}: { icon: React.ReactNode; label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition-colors ${
        on ? 'bg-primary/10 border-primary/40 text-foreground' : 'bg-background hover:bg-muted'
      }`}
    >
      <span className={on ? 'text-primary' : 'text-muted-foreground'}>{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      <span className={`text-[10px] font-semibold uppercase ${on ? 'text-primary' : 'text-muted-foreground'}`}>
        {on ? 'on' : 'off'}
      </span>
    </button>
  );
}

function PresetButton({
  active, onClick, icon, label,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium rounded-md border transition-colors ${
        active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'
      }`}
    >
      {icon} {label}
    </button>
  );
}

function formatHour(h: number): string {
  const hr = Math.floor(h);
  const min = Math.round((h - hr) * 60);
  const ampm = hr < 12 ? 'AM' : 'PM';
  const display = hr % 12 || 12;
  return `${display}:${String(min).padStart(2, '0')} ${ampm}`;
}
