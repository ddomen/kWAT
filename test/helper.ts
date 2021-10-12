import 'jasmine'

type Reporter = { new(options: any): jasmine.CustomReporter }
type ReporterOptions = { name: string, options?: any }
type Config = jasmine.Configuration & { reporters?: ReporterOptions[] }

const jenv = jasmine.getEnv();
const config: Config = jenv.configuration();

for (let rOpts of (config.reporters || [])) {
    try {
        const name = rOpts.name;
        if (!name) { continue; }
        const modNames = name.split('#');
        const mod = require(modNames.shift()!);
        const target: Reporter = modNames.reduce((t, n) => t[n], mod);
        const reporter = new target(rOpts.options || {});
        jenv.addReporter(reporter);
    } catch {}
}
