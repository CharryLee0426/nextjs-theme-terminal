export const CARD_WIDTH = 0.95;
export const CARD_HEIGHT = 1.3;
export const CARD_HALF_WIDTH = CARD_WIDTH / 2;
export const CARD_HALF_HEIGHT = CARD_HEIGHT / 2;

export const ROPE_SEGMENT_LENGTH = 0.22;
export const FIXED_ANCHOR_Y = 0.95;
export const CARD_JOINT_OFFSET_Y = CARD_HALF_HEIGHT + 0.12;

/** Approximate resting Y of the card center, used to frame the camera. */
export const CAMERA_TARGET_Y =
  FIXED_ANCHOR_Y - ROPE_SEGMENT_LENGTH * 3 - CARD_JOINT_OFFSET_Y;
