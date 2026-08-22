import { GetHelloUseCase } from './get-hello.use-case';

describe('GetHelloUseCase', () => {
  it('returns the API availability message', () => {
    const useCase = new GetHelloUseCase();

    expect(useCase.execute()).toBe('Hello World!');
  });
});
