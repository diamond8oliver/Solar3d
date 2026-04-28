import type { Project } from '@solar3d/shared';
import { formatKwh, formatCurrency, formatKw, getMonthLabel } from '../lib/utils';
import { Sun, Zap, DollarSign, TrendingUp, LayoutGrid, Gauge } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

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
    <div className="rounded-2xl border bg-card shadow-lg p-6 space-y-5 h-full overflow-y-auto">
      <div>
        <h3 className="text-lg font-semibold">System Overview</h3>
        <p className="text-sm text-muted-foreground">Based on satellite roof analysis</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Stat icon={<Sun className="h-4 w-4 text-amber-500" />} label="System Size" value={formatKw(panelLayout.totalCapacityKw)} />
        <Stat icon={<LayoutGrid className="h-4 w-4 text-blue-500" />} label="Panels" value={String(panelLayout.totalPanelCount)} />
        <Stat icon={<Zap className="h-4 w-4 text-yellow-500" />} label="Annual Production" value={formatKwh(energyEstimate.acAnnual)} />
        <Stat icon={<TrendingUp className="h-4 w-4 text-green-500" />} label="Bill Offset" value={`${offsetPercent}%`} />
        <Stat icon={<DollarSign className="h-4 w-4 text-emerald-500" />} label="Est. Annual Savings" value={formatCurrency(annualSavings)} />
        <Stat icon={<Gauge className="h-4 w-4 text-purple-500" />} label="Capacity Factor" value={`${energyEstimate.capacityFactor}%`} />
      </div>

      <Separator />

      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Monthly Production (kWh)</h4>
        <div className="flex items-end gap-1 h-28">
          {energyEstimate.acMonthly.map((kwh, i) => {
            const max = Math.max(...energyEstimate.acMonthly);
            const pct = max > 0 ? (kwh / max) * 100 : 0;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] text-muted-foreground">{Math.round(kwh / 100) * 100}</span>
                <div
                  className="w-full bg-primary/80 hover:bg-primary rounded-t transition-colors"
                  style={{ height: `${pct}%` }}
                  title={`${getMonthLabel(i)}: ${Math.round(kwh)} kWh`}
                />
                <span className="text-[10px] text-muted-foreground font-medium">{getMonthLabel(i)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <Separator />

      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="text-sm font-semibold mb-2">25-Year Projection</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Lifetime Savings</p>
            <p className="font-semibold text-green-600">{formatCurrency(annualSavings * 25 * 0.85)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Payback Period</p>
            <p className="font-semibold">{Math.round((panelLayout.totalCapacityKw * 2600) / annualSavings * 10) / 10} years</p>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Estimates based on satellite data and NREL solar models. A site visit
        and full engineering design are required for final pricing.
      </p>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
