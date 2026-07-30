export type SerialMutationRunner = <T>(
  mutation: () => Promise<T>,
) => Promise<T>;

export function createSerialMutationRunner(): SerialMutationRunner {
  let tail: Promise<unknown> = Promise.resolve();

  return <T>(mutation: () => Promise<T>): Promise<T> => {
    const result = tail.then(mutation);
    tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
}
