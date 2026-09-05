import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Baby, ClipboardList, Euro, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { AdminPageHeader } from '../../components/admin/common/AdminPageHeader';
import { RequestsTab } from './acollida/RequestsTab';
import { RatesTab } from './acollida/RatesTab';
import { OccupancyTab } from './acollida/OccupancyTab';

type Tab = 'requests' | 'occupancy' | 'rates';

interface TabDef {
    id: Tab;
    icon: LucideIcon;
    labelKey: string;
    labelDefault: string;
}

/**
 * Sol·licituds first, on purpose: until 2026-09 this screen only held the price
 * table, and the sign-ups were three clicks away inside the generic forms
 * manager — which is how the AFA ended up with a service nobody could list.
 */
const TABS: TabDef[] = [
    { id: 'requests', icon: ClipboardList, labelKey: 'admin.acollida.tabs.requests', labelDefault: 'Sol·licituds' },
    { id: 'occupancy', icon: Users, labelKey: 'admin.acollida.tabs.occupancy', labelDefault: 'Ocupació' },
    { id: 'rates', icon: Euro, labelKey: 'admin.acollida.tabs.rates', labelDefault: 'Tarifes' },
];

export default function AcollidaManager() {
    const { t } = useTranslation();
    const [tab, setTab] = useState<Tab>('requests');

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <AdminPageHeader
                title={t('admin.acollida.title', "Gestió d'Acollida")}
                subtitle={t('admin.acollida.subtitle_v2', "Sol·licituds de les famílies i preus de cada franja.")}
                icon={Baby}
            />

            <div className="flex gap-1 border-b border-neutral-200">
                {TABS.map(({ id, icon: Icon, labelKey, labelDefault }) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() => setTab(id)}
                        aria-current={tab === id ? 'page' : undefined}
                        className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
                            tab === id
                                ? 'border-neutral-900 text-neutral-900'
                                : 'border-transparent text-neutral-500 hover:text-neutral-800'
                        }`}
                    >
                        <Icon className="w-4 h-4" />
                        {t(labelKey, labelDefault)}
                    </button>
                ))}
            </div>

            {tab === 'requests' ? <RequestsTab /> : tab === 'occupancy' ? <OccupancyTab /> : <RatesTab />}
        </div>
    );
}
