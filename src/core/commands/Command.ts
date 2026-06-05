export interface ICommand {
  id: string;
  description: string;
  execute(): void;
  undo(): void;
}

export class CompositeCommand implements ICommand {
  id: string;
  description: string;
  private commands: ICommand[];

  constructor(id: string, description: string, commands: ICommand[]) {
    this.id = id;
    this.description = description;
    this.commands = commands;
  }

  execute(): void {
    for (const cmd of this.commands) {
      cmd.execute();
    }
  }

  undo(): void {
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }
}
