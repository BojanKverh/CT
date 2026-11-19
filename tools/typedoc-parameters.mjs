import { Converter, ReflectionKind } from "typedoc";

/** Show conventional unused-parameter names without changing source signatures. */
export function load(app) {
    app.converter.on(Converter.EVENT_RESOLVE_END, context => {
        for (const reflection of Object.values(context.project.reflections)) {
            if (reflection.kindOf(ReflectionKind.Parameter) && /^_[a-zA-Z]/.test(reflection.name)) {
                reflection.name = reflection.name.slice(1);
            }
        }
    });
}
