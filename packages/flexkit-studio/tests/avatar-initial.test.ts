import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getAvatarInitial } from '../src/ui/components/avatar-initial';

test('the initial of the name, in upper case', () => {
  assert.equal(getAvatarInitial('ada Lovelace', 'someone@example.com'), 'A');
  assert.equal(getAvatarInitial('  émile', null), 'É');
});

test('the first letter of the email address when there is no name', () => {
  assert.equal(getAvatarInitial('', 'grace@example.com'), 'G');
  assert.equal(getAvatarInitial('   ', 'hopper@example.com'), 'H');
  assert.equal(getAvatarInitial(null, 'x@example.com'), 'X');
  assert.equal(getAvatarInitial(undefined, '9lives@example.com'), '9');
});

test('nothing when there is neither', () => {
  assert.equal(getAvatarInitial(null, undefined), '');
  assert.equal(getAvatarInitial('', '  '), '');
});

test('a whole character, not half of one', () => {
  assert.equal(getAvatarInitial('𝒶da', null), '𝒶'.toLocaleUpperCase());
  assert.equal(getAvatarInitial('李雷', null), '李');
});
