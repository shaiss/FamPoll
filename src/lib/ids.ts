import { customAlphabet } from "nanoid";

const alphabet = "0123456789abcdefghijkmnpqrstuvwxyz";
const gen = customAlphabet(alphabet, 14);
const codeGen = customAlphabet("abcdefghjkmnpqrstuvwxyz23456789", 8);

export const newId = () => gen();
/** Short, readable, unambiguous: used for invite codes and share links. */
export const newCode = () => codeGen();
