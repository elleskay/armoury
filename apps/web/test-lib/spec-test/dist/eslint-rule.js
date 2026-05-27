const SPEC_ID_RE = /^\[([A-Z][A-Z0-9]*(?:-[A-Z][A-Z0-9]*)+-\d{3,})\]/;
function calleeName(node) {
    const c = node.callee;
    if (c.type === "Identifier")
        return c.name;
    if (c.type === "MemberExpression") {
        const prop = c
            .property;
        if (prop.type === "Identifier")
            return prop.name ?? null;
    }
    return null;
}
function getStringLiteral(node) {
    if (!node)
        return null;
    if (node.type === "Literal" && typeof node.value === "string") {
        return node.value;
    }
    if (node.type === "TemplateLiteral") {
        const tl = node;
        if (tl.expressions.length === 0 && tl.quasis.length === 1) {
            return tl.quasis[0]?.value.cooked ?? null;
        }
    }
    return null;
}
function findBodyFunction(node) {
    for (const arg of node.arguments) {
        if (arg.type === "FunctionExpression" ||
            arg.type === "ArrowFunctionExpression") {
            return arg;
        }
    }
    return null;
}
function bodyHasExpect(body) {
    let found = false;
    const visit = (n) => {
        if (found || !n || typeof n !== "object")
            return;
        const node = n;
        if (node.type === "CallExpression") {
            const ce = node;
            const name = calleeName(ce);
            if (name === "expect") {
                found = true;
                return;
            }
        }
        for (const key of Object.keys(node)) {
            if (key === "parent" || key === "loc" || key === "range")
                continue;
            const child = node[key];
            if (Array.isArray(child)) {
                for (const c of child)
                    visit(c);
            }
            else if (child && typeof child === "object") {
                visit(child);
            }
            if (found)
                return;
        }
    };
    visit(body.body);
    return found;
}
export const requireExpectInSpecTest = {
    meta: {
        type: "problem",
        docs: {
            description: "Require at least one expect() call inside every test whose title is prefixed with a spec ID like [ARM-XXX-001]",
        },
        schema: [],
        messages: {
            missingExpect: "test('[{{id}}] ...') must contain at least one expect() call. A spec requirement that records no assertion does not verify behavior.",
            missingBody: "test('[{{id}}] ...') must have a function body.",
        },
    },
    create(context) {
        return {
            CallExpression(node) {
                const callee = calleeName(node);
                if (callee !== "test" && callee !== "it")
                    return;
                const title = getStringLiteral(node.arguments[0]);
                if (!title)
                    return;
                const m = SPEC_ID_RE.exec(title);
                if (!m)
                    return;
                const id = m[1] ?? "<unknown>";
                const body = findBodyFunction(node);
                if (!body) {
                    context.report({ node, messageId: "missingBody", data: { id } });
                    return;
                }
                if (!bodyHasExpect(body)) {
                    context.report({ node, messageId: "missingExpect", data: { id } });
                }
            },
        };
    },
};
export const plugin = {
    rules: {
        "require-expect-in-spec-test": requireExpectInSpecTest,
    },
};
//# sourceMappingURL=eslint-rule.js.map