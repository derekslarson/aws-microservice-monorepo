/* eslint-disable */

import "jasmine";

export type Spied<T> = {
  [Method in keyof T]: jasmine.Spy;
};

export class TestSupport {
  public static spyOnClass<T extends { new (...args: any[]): unknown; }>(classToSpyOn: T): Spied<InstanceType<T>> {
    const { prototype } = classToSpyOn;
    const baseClassPrototype = Object.getPrototypeOf(classToSpyOn).prototype;
    const methods = [ ...this.getMethodNames(prototype), ...this.getMethodNames(baseClassPrototype) ];

    return jasmine.createSpyObj("spy", methods) as Spied<InstanceType<T>>;
  }

  private static getMethodNames(prototype: Record<string, unknown> = {}): string[] {
    return Object.getOwnPropertyNames(prototype).filter((name) => Object.getOwnPropertyDescriptor(prototype, name)?.value instanceof Function);
  }
}
