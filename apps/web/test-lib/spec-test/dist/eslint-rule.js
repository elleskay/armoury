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
            description: "Require at least one expect() call inside every specTest body",
        },
        schema: [],
        messages: {
            missingExpect: "specTest('{{id}}') must contain at least one expect() call. A spec requirement that records no assertion does not verify behavior.",
            missingBody: "specTest('{{id}}') must be called with a function body.",
        },
    },
    create(context) {
        return {
            CallExpression(node) {
                if (calleeName(node) !== "specTest")
                    return;
                const firstArg = node.arguments[0];
                const id = firstArg && firstArg.type === "Literal" && typeof firstArg.value === "string"
                    ? firstArg.value
                    : "<unknown>";
                const body = findBodyFunction(node);
                if (!body) {
                    context.report({
                        node,
                        messageId: "missingBody",
                        data: { id },
                    });
                    return;
                }
                if (!bodyHasExpect(body)) {
                    context.report({
                        node,
                        messageId: "missingExpect",
                        data: { id },
                    });
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