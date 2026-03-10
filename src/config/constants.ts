// Physics
export const PHYSICS_TIMESTEP = 1 / 60;
export const GRAVITY = { x: 0, y: -9.81, z: 0 };

// Arm dimensions (meters, scaled up for game visibility — roughly 3x real SO-100)
export const ARM_BASE_HEIGHT = 0.15;
export const ARM_BASE_RADIUS = 0.08;
export const ARM_SHOULDER_LENGTH = 0.30;
export const ARM_ELBOW_LENGTH = 0.30;
export const ARM_WRIST_LENGTH = 0.15;
export const ARM_LINK_RADIUS = 0.03;

// Joint motor parameters
export const JOINT_MAX_VELOCITY = 1.0; // rad/s
export const JOINT_ACCEL = 3.0; // rad/s² — acceleration toward target velocity
export const JOINT_FRICTION_DECEL = 8.0; // rad/s² — deceleration when no input (friction)
export const JOINT_MOTOR_STIFFNESS = 5000.0;
export const JOINT_MOTOR_DAMPING = 500.0;
export const JOINT_MAX_FORCE = 200.0;
export const BASE_SLIDE_SPEED = 0.3; // m/s
export const BASE_SLIDE_RANGE = 0.5; // m from center
export const BASE_Z_SPEED = 0.5; // m/s — vertical lift speed
export const BASE_Z_MIN = 0.0; // m — lowest base Y offset (table surface)
export const BASE_Z_MAX = 0.6; // m — highest base Y offset

// Joint limits (radians)
export const SHOULDER_ROTATION_LIMIT = Math.PI / 2; // ±90°
export const SHOULDER_PITCH_MIN = -0.1; // ~6° backward
export const SHOULDER_PITCH_MAX = Math.PI * 0.85; // ~153° forward (reach the table)
export const ELBOW_PITCH_MIN = -0.1;
export const ELBOW_PITCH_MAX = Math.PI * 0.8;
export const WRIST_PITCH_MIN = -0.1; // ~6° backward
export const WRIST_PITCH_MAX = Math.PI * 0.5;
export const WRIST_ROLL_LIMIT = Math.PI; // ±180°

// Gripper
export const GRIPPER_OPEN_DISTANCE = 0.06;
export const GRIPPER_CLOSED_DISTANCE = 0.005;
export const GRIPPER_FINGER_LENGTH = 0.14;
export const GRIPPER_FINGER_WIDTH = 0.028;
export const GRIPPER_FINGER_DEPTH = 0.02;
export const GRIPPER_TIP_LENGTH = 0.045;
export const GRIPPER_TIP_ANGLE = Math.PI / 4; // 45° inward hook
export const GRIPPER_SPEED = 0.04; // m/s
export const GRIPPER_OPEN_ANGLE = Math.PI / 3; // 60° max finger splay
export const GRIP_ALIGNMENT_TOLERANCE = 0.05; // meters
export const GRIP_ANGULAR_TOLERANCE = 0.5; // radians (~28°)

// Table
export const TABLE_WIDTH = 2.0;
export const TABLE_DEPTH = 1.4;
export const TABLE_HEIGHT = 0.05;
export const TABLE_Y = 0; // table top surface at y=0

// Scoring weights
export const SCORE_WEIGHT_ALIGNMENT = 0.35;
export const SCORE_WEIGHT_JUDGMENT = 0.25;
export const SCORE_WEIGHT_SMOOTHNESS = 0.20;
export const SCORE_WEIGHT_STABILITY = 0.20;

// Game
export const LIFT_THRESHOLD = 0.10; // meters above table to count as lifted
export const HOLD_DURATION_MS = 500; // ms to hold for success
export const COMMIT_ZONE_MULTIPLIER = 0.5; // commit_height = object_top + height * this

// Visual
export const BG_COLOR = 0x6b6560;
export const GOLD_ACCENT = '#c9a84c';
export const PANEL_BG = '#2a2018';
export const ARM_COLOR = 0x3a3a3a;
export const ARM_ROUGHNESS = 0.8;
export const ARM_METALNESS = 0.3;
export const TABLE_COLOR = 0x8a8a8a;
export const TABLE_ROUGHNESS = 0.3;
export const TABLE_METALNESS = 0.8;
