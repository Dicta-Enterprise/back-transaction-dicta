import { esIpPublica } from './ip-publica';

describe('esIpPublica', () => {
  it('acepta direcciones públicas, también las que llegan en formato IPv6 mapeado', () => {
    expect(esIpPublica('8.8.8.8')).toBe(true);
    expect(esIpPublica('181.49.10.20')).toBe(true);
    expect(esIpPublica('::ffff:181.49.10.20')).toBe(true);
    expect(esIpPublica('2800:484:1234::1')).toBe(true);
  });

  it('descarta la propia máquina y las redes internas, que no tienen país ni ciudad', () => {
    for (const ip of ['127.0.0.1', '::1', '::ffff:127.0.0.1', '10.0.0.5', '192.168.1.20', '172.16.0.1', '172.31.255.1', '169.254.1.1', '100.64.0.1', '0.0.0.0', 'fd00::1', 'fe80::1']) {
      expect(esIpPublica(ip)).toBe(false);
    }
  });

  it('no confunde rangos parecidos con los privados', () => {
    expect(esIpPublica('172.15.0.1')).toBe(true);
    expect(esIpPublica('172.32.0.1')).toBe(true);
    expect(esIpPublica('100.63.0.1')).toBe(true);
  });

  it('descarta valores vacíos o que no son una IP', () => {
    for (const ip of [null, undefined, '', '   ', 'no-es-una-ip', '999.1.1.1']) {
      expect(esIpPublica(ip as string)).toBe(false);
    }
  });
});
