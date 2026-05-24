import Link from "next/link";
import { createTemplate, listTeams } from "../actions";

export default async function NewTemplatePage() {
  const teams = await listTeams();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">New checklist template</h1>
        <Link href="/admin/templates" className="text-sm text-gray-600 hover:text-gray-900">
          Cancel
        </Link>
      </div>

      <form action={createTemplate} className="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
        <div className="space-y-1">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            minLength={3}
            maxLength={200}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
            placeholder="Fire Truck Daily Check"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description (optional)
          </label>
          <textarea
            id="description"
            name="description"
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="teamId" className="block text-sm font-medium text-gray-700">
            Assign to team
          </label>
          <select
            id="teamId"
            name="teamId"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
          >
            <option value="">All teams</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name} ({team.agency})
              </option>
            ))}
          </select>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-gray-700">Checklist items</legend>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-2">
              <input
                name="itemLabel"
                type="text"
                placeholder={i === 0 ? "Required, e.g. Tyres in good condition" : "Add another item"}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
              />
              <select
                name="itemKind"
                defaultValue="boolean"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
              >
                <option value="boolean">Yes/No</option>
                <option value="text">Text</option>
                <option value="number">Number</option>
              </select>
            </div>
          ))}
          <p className="text-xs text-gray-500">Empty items are ignored. At least one is required.</p>
        </fieldset>

        <div className="flex justify-end gap-3">
          <Link
            href="/admin/templates"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Create template
          </button>
        </div>
      </form>
    </div>
  );
}
