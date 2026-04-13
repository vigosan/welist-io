import "@testing-library/jest-dom";
import "../i18n";
import { server } from "./msw-server";

const mockObserver = { observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() };
vi.stubGlobal("IntersectionObserver", vi.fn(() => mockObserver));
vi.stubGlobal("scrollTo", vi.fn());

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
