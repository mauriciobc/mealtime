export abstract class Singleton<T> {
  protected static instance: any;

  protected constructor() {}

  public static getInstance<T>(this: new () => T): T {
    const ctor = this as any;
    if (!ctor.instance) {
      ctor.instance = new this();
    }
    return ctor.instance;
  }
} 