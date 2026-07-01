import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ParticipantsPanel } from "./ParticipantsPanel";

const removeMutate = vi.fn();
vi.mock("@/hooks/useList", () => ({
  useRemoveCollaborator: () => ({ mutate: removeMutate, isPending: false }),
}));

const collaborators = [
  { id: "c1", name: "Rocio", image: null },
  { id: "c2", name: "Salva", image: null },
];

describe("ParticipantsPanel collaborator removal", () => {
  beforeEach(() => removeMutate.mockClear());

  it("shows a remove button per collaborator for the owner", () => {
    render(
      <ParticipantsPanel
        listId="l1"
        isOwner
        challengers={[]}
        collaborators={collaborators}
      />
    );
    expect(
      screen.getByTestId("participant-remove-collaborator-c1")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("participant-remove-collaborator-c2")
    ).toBeInTheDocument();
  });

  it("removes the collaborator when the owner clicks the button", async () => {
    render(
      <ParticipantsPanel
        listId="l1"
        isOwner
        challengers={[]}
        collaborators={collaborators}
      />
    );
    await userEvent.click(
      screen.getByTestId("participant-remove-collaborator-c1")
    );
    expect(removeMutate).toHaveBeenCalledWith("c1");
  });

  it("hides the remove button for non-owners", () => {
    render(
      <ParticipantsPanel
        listId="l1"
        isOwner={false}
        challengers={[]}
        collaborators={collaborators}
      />
    );
    expect(
      screen.queryByTestId("participant-remove-collaborator-c1")
    ).not.toBeInTheDocument();
  });
});
