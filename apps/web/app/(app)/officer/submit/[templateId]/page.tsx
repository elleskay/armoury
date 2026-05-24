import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { templates, templateItems } from "@/db/schema";
import { requireOfficer } from "@/lib/session";
import { submitChecklist } from "../../actions";

export default async function SubmitPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  await requireOfficer();
  const { templateId } = await params;

  const template = (
    await db.select().from(templates).where(eq(templates.id, templateId)).limit(1)
  )[0];

  if (!template) notFound();

  const items = await db
    .select()
    .from(templateItems)
    .where(eq(templateItems.templateId, templateId))
    .orderBy(templateItems.position);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{template.name}</h1>
        {template.description ? (
          <p className="mt-1 text-sm text-gray-600">{template.description}</p>
        ) : null}
      </div>

      <form action={submitChecklist} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        <input type="hidden" name="templateId" value={template.id} />

        {items.map((item, idx) => (
          <div key={item.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
            <div className="flex items-start justify-between gap-4">
              <label className="text-sm font-medium text-gray-900">
                {idx + 1}. {item.label}
                {item.required ? <span className="ml-1 text-red-500">*</span> : null}
              </label>

              {item.kind === "boolean" ? (
                <div className="flex gap-3 text-sm">
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      name={`v:${item.id}`}
                      value="yes"
                      defaultChecked
                      className="h-4 w-4"
                    />
                    Yes
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="radio" name={`v:${item.id}`} value="no" className="h-4 w-4" />
                    No
                  </label>
                </div>
              ) : item.kind === "number" ? (
                <input
                  type="number"
                  name={`v:${item.id}`}
                  required={item.required}
                  className="w-32 rounded-md border border-gray-300 px-3 py-1 text-sm focus:border-gray-900 focus:outline-none"
                />
              ) : (
                <input
                  type="text"
                  name={`v:${item.id}`}
                  required={item.required}
                  className="w-64 rounded-md border border-gray-300 px-3 py-1 text-sm focus:border-gray-900 focus:outline-none"
                />
              )}
            </div>

            <div className="mt-2">
              <input
                type="text"
                name={`note:${item.id}`}
                placeholder="Optional issue note (leaving this blank means no problem)"
                className="w-full rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-700 focus:border-gray-900 focus:outline-none"
              />
            </div>
          </div>
        ))}

        <div className="flex justify-end gap-3 pt-2">
          <Link
            href="/officer"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Submit checklist
          </button>
        </div>
      </form>
    </div>
  );
}
