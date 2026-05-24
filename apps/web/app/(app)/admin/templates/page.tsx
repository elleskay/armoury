import Link from "next/link";
import { desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { templates, teams, users } from "@/db/schema";
import { requireAdmin } from "@/lib/session";

export default async function TemplatesPage() {
  await requireAdmin();

  const rows = await db
    .select({
      id: templates.id,
      name: templates.name,
      description: templates.description,
      createdAt: templates.createdAt,
      teamName: teams.name,
      createdByName: users.name,
    })
    .from(templates)
    .leftJoin(teams, eq(templates.teamId, teams.id))
    .leftJoin(users, eq(templates.createdById, users.id))
    .where(isNull(templates.archivedAt))
    .orderBy(desc(templates.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Checklist Templates</h1>
        <Link
          href="/admin/templates/new"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          New template
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-gray-500">No templates yet. Create one to deploy to your team.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Team
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Created by
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 text-sm">
                    <div className="font-medium text-gray-900">{row.name}</div>
                    {row.description ? (
                      <div className="text-gray-500">{row.description}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{row.teamName ?? "All teams"}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{row.createdByName ?? "n/a"}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {row.createdAt.toISOString().slice(0, 10)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
