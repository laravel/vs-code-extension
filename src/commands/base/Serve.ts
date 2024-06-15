import { Terminal, window, workspace } from 'vscode';
import Common from '../../Common';

export default class Server extends Common {
  private static terminal: Terminal;
  private static host: string;
  private static port: string;

  public static async run(useDefaults = false) {
    const config = workspace.getConfiguration('artisan');
    const wsl = config.get<boolean>('wsl.enabled', false);
    const defaultHost = config.get<string>('serve.defaultHost', 'localhost');
    const defaultPort = config.get<string>('serve.defaultPort', '8000');
    const phpLocation = config.get<string | null>('php.location', 'php');

    const host = useDefaults ? defaultHost : await this.getInput(`Should I use a specific host (Default: ${defaultHost})?`);
    const port = useDefaults ? defaultPort : await this.getInput(`Should I use a specific port (Default: ${defaultPort})?`);

    Server.host = host.length > 0 ? host : defaultHost;
    Server.port = port.length > 0 ? port : defaultPort;

    let artisanToUse = await this.listArtisanPaths();

    Server.terminal = window.createTerminal('Laravel Artisan Server');
    Server.terminal.show();

    if (wsl) {
      Server.terminal.sendText('wsl');
      artisanToUse = artisanToUse.replace(/^(\w):/, '/mnt/$1').replace(/\\/g, '/');
    }
    setTimeout(() => {
      Server.terminal.sendText(`${phpLocation} "${artisanToUse}" serve --host=${Server.host} --port=${Server.port}`);
      this.showMessage(`The server is now running on "http://${Server.host}:${Server.port}"`);
    }, 1000);
  }

  public static async stop() {
    if (Server.terminal) {
      Server.terminal.dispose();
      this.showMessage(`The server has been stopped on "http://${Server.host}:${Server.port}"`);
    } else {
      this.showError('There is no server currently running');
    }
  }

  public static async restart() {
    Server.stop();
    Server.run();
  }
}
