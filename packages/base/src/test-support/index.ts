/* eslint-disable */

import "jest";

export type Spied<T> = {
    [Method in keyof T]: jest.Mock;
};

export class TestSupport {
    public static spyOnClass<T extends { new (...args: any[]): unknown }>(classToSpyOn: T): Spied<InstanceType<T>> {
        const { prototype } = classToSpyOn;
        const baseClassPrototype = Object.getPrototypeOf(classToSpyOn).prototype;
        const methods = [...this.getMethodNames(prototype), ...this.getMethodNames(baseClassPrototype)];
        const mockedObj: any = {};

        for (let i = 0; i < methods.length; i++) {
            mockedObj[methods[i]] = jest.fn();
        }

        return mockedObj as Spied<InstanceType<T>>;
    }

    private static getMethodNames(prototype: Record<string, unknown> = {}): string[] {
        return Object.getOwnPropertyNames(prototype).filter((name) => Object.getOwnPropertyDescriptor(prototype, name)?.value instanceof Function);
    }
}
