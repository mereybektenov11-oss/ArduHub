import { errorCopy } from "@/domain/checker/errors.ru";
import type { ErrorCode } from "@/domain/types";
import { mentorCopy as c } from "@/content/cabinet.ru";
export function templateReply(message = "", code?: string): string {
  if (
    /(?:220|230)\s*(?:в|v)|розетк|сетев[а-яё]*\s+напряж|мощн[а-яё]*\s+аккум|литий|lipo|li-ion/i.test(
      message,
    )
  )
    return c.safety;
  if (/готов[а-яё]*\s+код|решени|забудь\s+правил/i.test(message))
    return c.nextHint;
  if (code && Object.hasOwn(errorCopy, code))
    return `${errorCopy[code as ErrorCode][1]} ${errorCopy[code as ErrorCode][2]}`;
  if (/резистор|ток/i.test(message)) return c.resistor;
  if (/светодиод|анод|катод/i.test(message)) return c.led;
  if (/кнопк/i.test(message)) return c.button;
  if (/пин|gnd|провод|схем|arduino|ардуино|питан|электр|напряж/i.test(message))
    return c.circuit;
  return c.redirect;
}
