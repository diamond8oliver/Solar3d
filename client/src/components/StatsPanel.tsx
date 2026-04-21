import type { Project } from '@solar3d/shared';
import { formatKwh, formatCurrency, formatKw, getMonthLabel } from '../lib/utils';

interface Props {
  project: Project;
}

export default function StatsPanel({ project }: Props) {
  const { panelLayout, energyEstimate, monthlyBillUsd, utilityRatePerKwh } = project;

  const annualBill = monthlyBillUsd * 12;
  const annualSavings = energyEstimate.acAnnual * utilityRatePerKwh;
  const offsetPercent = annualBill > 0
    ? Math.min(100, Math.round((annualSavings / annualBill) * 100))
    : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
      <h3 className="text-lg font-semibold text-gray-800">System Overview</h3>

      <div className="grid grid-cols-2 gap-4">
        <Stat label="System Size" value={formatKw(panelLayout.totalCapacityKw)} />
        <Stat label="Panels" value={String(panelLayout.totalPanelCount)} />
        <Stat label="Annual Production" value={formatKwh(energyEstimate.acAnnual)} />
        <Stat label="Bill Offset" value={`${offsetPercent}%`} />
        <Stat label="Est. Annual Savings" value={formatCurrency(annualSavings)} />
        <Stat label="Capacity Factor" value={`${energyEstimate.capacityFactor}%`} />
      </div>

      {/* Monthly production bar chart */}
      <div>
        <h4 className="text-sm font-medium text-gray-600 mb-2">Monthly Production</h4>
        <div className="flex items-end gap-1 h-24">
          {energyEstimate.acMonthly.map((kwh, i) => {
            const max = Math.max(...energyEstimate.acMonthly);
            const pct = max > 0 ? (kwh / max) * 100 : 0;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className="w-full bg-blue-500 rounded-t"
                  style={{ height: `${pct}%` }}
                  title={`${getMonthLabel(i)}: ${Math.round(kwh)} kWh`}
                />
                <span className="text-[10px] text-gray-500">{getMonthLabel(i)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Estimates based on solar resource data and system modeling. A site visit
        and full engineering design are required for final pricing and production
        guarantees.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}
