"use client";

import { staffModules, type StaffPermissionRow } from "@/lib/staffPermissions";

interface StaffPermissionEditorProps {
  permissions: StaffPermissionRow[];
  onChange: (permissions: StaffPermissionRow[]) => void;
}

export default function StaffPermissionEditor({ permissions, onChange }: StaffPermissionEditorProps) {
  const getPermissionForModule = (moduleName: string) => {
    return (
      permissions.find((permission) => permission.module_name === moduleName) || {
        module_name: moduleName as any,
        can_view: false,
        can_create: false,
        can_edit: false,
        can_delete: false,
      }
    );
  };

  const setPermission = (
    moduleName: string,
    key: keyof Omit<StaffPermissionRow, "id" | "staff_id" | "module_name">,
    value: boolean
  ) => {
    const next = permissions.map((permission) => {
      if (permission.module_name !== moduleName) return permission;
      return { ...permission, [key]: value };
    });

    if (!next.some((permission) => permission.module_name === moduleName)) {
      next.push({
        module_name: moduleName as any,
        can_view: key === "can_view" ? value : false,
        can_create: key === "can_create" ? value : false,
        can_edit: key === "can_edit" ? value : false,
        can_delete: key === "can_delete" ? value : false,
      });
    }

    onChange(next);
  };

  return (
    <div className="space-y-6">
      {staffModules.map((module) => {
        const permission = getPermissionForModule(module.module);

        return (
          <div key={module.module} className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">{module.label}</h3>
                <p className="text-sm text-slate-500">{module.description}</p>
              </div>
              <span className="inline-flex rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                {module.module}
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {module.actions.map((action) => (
                <label
                  key={`${module.module}-${action.key}`}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                >
                  <input
                    type="checkbox"
                    checked={permission[action.key]}
                    onChange={(event) => setPermission(module.module, action.key, event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700">{action.label}</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
