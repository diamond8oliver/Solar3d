import type { PanelLayout } from '@solar3d/shared';
import PanelMesh from './PanelMesh';

interface Props {
  layout: PanelLayout;
}

/** Renders all panels in the layout as a group. */
export default function PanelArray({ layout }: Props) {
  return (
    <group>
      {layout.panels.map((panel) => (
        <PanelMesh
          key={panel.id}
          panel={panel}
          width={layout.panelWidthMeters}
          height={layout.panelHeightMeters}
        />
      ))}
    </group>
  );
}
