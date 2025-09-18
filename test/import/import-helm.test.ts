import * as path from 'path';
import { testImportMatchSnapshot } from './util';
import { Language } from '../../src/import/base';
import { ImportHelm } from '../../src/import/helm';
import { parseImports } from '../../src/util';

// TODO add multiple chart urls to test. Especially after fixing Json2Jsii issues
describe.each([
  'helm:https://charts.bitnami.com/bitnami/mysql@9.10.10', // Contains schema and dependencies
  'helm:https://kubernetes.github.io/ingress-nginx/ingress-nginx@4.8.0', // Does not contain schema
  'helm:https://lacework.github.io/helm-charts/lacework-agent@6.9.0',
  'helm:oci://registry-1.docker.io/bitnamicharts/mysql@9.12.5',
  'minio:=helm:https://operator.min.io/operator@5.0.9',
  'helm:https://grafana.github.io/helm-charts/loki@5.27.0',
])('importing helm chart %s', (testChartUrl) => {
  const spec = parseImports(testChartUrl);

  testImportMatchSnapshot('with typescript lanugage', async () => ImportHelm.fromSpec(spec));
  testImportMatchSnapshot('with python lanugage', async () => ImportHelm.fromSpec(spec), { targetLanguage: Language.PYTHON });
});

describe('local helm chart import', () => {
  const localChartPath = path.join(__dirname, 'fixtures', 'test-helm-chart');

  test('imports local chart with relative path', async () => {
    const testUrl = `helm:${localChartPath}`;
    const spec = parseImports(testUrl);

    const importer = await ImportHelm.fromSpec(spec);
    expect(importer.moduleNames).toEqual(['test-chart']);
  });

  test('imports local chart with absolute path', async () => {
    const absolutePath = path.resolve(localChartPath);
    const testUrl = `helm:${absolutePath}`;
    const spec = parseImports(testUrl);

    const importer = await ImportHelm.fromSpec(spec);
    expect(importer.moduleNames).toEqual(['test-chart']);
  });

  test('imports local chart with current directory reference', async () => {
    const testUrl = `helm:./${path.relative(process.cwd(), localChartPath)}`;
    const spec = parseImports(testUrl);

    const importer = await ImportHelm.fromSpec(spec);
    expect(importer.moduleNames).toEqual(['test-chart']);
  });
});

describe('helm chart import validations', () => {
  test('throws if url is not valid', async () => {
    const testUrl = 'helm:fooBar@9.10.10';
    const spec = parseImports(testUrl);

    await expect(() => ImportHelm.fromSpec(spec)).rejects.toThrow('Invalid helm URL: helm:fooBar@9.10.10. Must match the format: \'helm:<repo-url>/<chart-name>@<chart-version>\'.');
  });

  test('throws if chart version is not valid', async () => {
    const testUrl = 'helm:https://charts.bitnami.com/bitnami/mysql@9.10.+FooBar';
    const spec = parseImports(testUrl);

    await expect(() => ImportHelm.fromSpec(spec)).rejects.toThrow('Invalid chart version (9.10.+FooBar) in URL: helm:https://charts.bitnami.com/bitnami/mysql@9.10.+FooBar. Must follow SemVer-2 (see https://semver.org/).');
  });

  test('throws if url leads to no helm chart', async () => {
    const testUrl = 'helm:https://charts.bitnami.com/bitnami/mysql@1000.1000.1000';
    const spec = parseImports(testUrl);

    await expect(() => ImportHelm.fromSpec(spec)).rejects.toThrow();
  });

  test('throws if local chart path does not exist', async () => {
    const testUrl = 'helm:./non-existent-chart';
    const spec = parseImports(testUrl);

    await expect(() => ImportHelm.fromSpec(spec)).rejects.toThrow('Local chart path does not exist:');
  });

  test('throws if local chart path does not contain Chart.yaml', async () => {
    const testUrl = 'helm:./test/import/fixtures'; // Directory exists but no Chart.yaml
    const spec = parseImports(testUrl);

    await expect(() => ImportHelm.fromSpec(spec)).rejects.toThrow('Chart.yaml not found in local path:');
  });
});