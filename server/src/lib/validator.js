import { z } from "zod";
export const HelpTypeSchema = z.enum(["FOOD", "WATER", "MEDICAL", "RESCUE", "SHELTER", "OTHER"]);
export const UrgencySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export const StatusSchema = z.enum(["PENDING", "ACKNOWLEDGED", "ASSIGNED", "RESOLVED", "CANCELLED"]);
export const RoleSchema = z.enum(["CITIZEN", "VOLUNTEER", "ADMIN"]);
export const GenderSchema = z.enum(["MALE", "FEMALE", "OTHER"]);

const GpsCoordinateSchema = z.array(z.number()).length(2, "GPS coordinates must contain exactly [latitude, longitude]");


export const CreateUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  age: z.number().min(2).max(100),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
  role: RoleSchema,
  skills: z.string().nullable().optional(),
  lastKnownGPS: GpsCoordinateSchema.optional()
});

export const UpdateUserSchema = CreateUserSchema.partial();


export const CreateSosSchema = z.object({
  sosUuid: z.string().uuid("Invalid SOS UUID format"),
  reporterId: z.string().uuid("Invalid Reporter ID format"),
  assignedToId: z.string().uuid("Invalid Assigned User ID format").nullable().optional(),
  reporterName: z.string().min(1, "Reporter name is required"),
  lastKnownGPS: GpsCoordinateSchema,
  landmarkText: z.string().nullable().optional(),
  helpType: HelpTypeSchema,
  urgency: UrgencySchema,
  peopleCount: z.number().int().min(1, "People count must be at least 1"),
  hasChildren: z.boolean().default(false),
  hasElderly: z.boolean().default(false),
  hasDisabled: z.boolean().default(false),
  medicalNeed: z.boolean().default(false),
  transcription: z.string().nullable().optional(),
  desc: z.string().nullable().optional(),
  imageUrl: z.string().url("Invalid image URL format").nullable().optional(),
  audioUrl: z.string().url("Invalid audio URL format").nullable().optional(),
  status: StatusSchema.default("PENDING"),
  priorityScore: z.number().min(0).default(0),
});

export const UpdateSosSchema = CreateSosSchema.partial();

export const CreateMissingPersonSchema = z.object({
  personName: z.string().min(1, "Missing person name is required"),
  age: z.number().int().min(0).max(120).nullable().optional(),
  gender: GenderSchema.nullable().optional(),
  photoUrl: z.string().url("Invalid photo URL format"),
  contactName: z.string().min(1, "Contact name is required"),
  contactPhone: z.string().min(10, "Contact phone must be at least 10 digits"),
  shelter: z.string().nullable().optional(),
});

export const CreateShelterResidentSchema = z.object({
  residentName: z.string().min(1, "Resident name is required"),
  age: z.number().int().min(0).max(120).nullable().optional(),
  gender: GenderSchema.nullable().optional(),
  contactPhone: z.string().min(10, "Contact phone must be at least 10 digits").nullable().optional(),
  shelterName: z.string().min(1, "Shelter name is required"),
  notes: z.string().nullable().optional(),
});

export const ConfirmMissingMatchSchema = z.object({
  shelterResidentId: z.string().uuid("Invalid shelter resident ID format"),
});

// ── Damage Assessment Schemas ─────────────────────────────────────────────────

export const DamageGradeSchema   = z.enum(["MINOR", "MAJOR", "DESTROYED"]);
export const PropertyTypeSchema  = z.enum(["RESIDENTIAL", "COMMERCIAL", "AGRICULTURAL"]);
export const ReviewStatusSchema  = z.enum(["PENDING_REVIEW", "APPROVED", "REJECTED", "NEEDS_REVISIT"]);

// Multipart form fields come in as strings — coerce numbers explicitly
export const SubmitDamageReportSchema = z.object({
  claimedGpsLat:   z.coerce.number({ invalid_type_error: "claimedGpsLat must be a number" })
                    .min(-90).max(90),
  claimedGpsLng:   z.coerce.number({ invalid_type_error: "claimedGpsLng must be a number" })
                    .min(-180).max(180),
  propertyType:    PropertyTypeSchema.default("RESIDENTIAL"),
  disasterCutoff:  z.string()
                    .min(1, "disasterCutoff is required")
                    .refine(
                      (v) => !isNaN(Date.parse(v)),
                      "disasterCutoff must be a valid ISO-8601 date string"
                    ),
  ownershipProof:  z.string().url("ownershipProof must be a valid URL").nullable().optional(),
});

export const ReviewDamageReportSchema = z.object({
  reviewStatus:       ReviewStatusSchema,
  reviewNote:         z.string().max(1000).nullable().optional(),
  compensationAmount: z.coerce.number().min(0).nullable().optional(),
});

export const validate = (schema) => async(req, res, next) => {
    try {
        const response = await schema.safeParseAsync(req.body);
        

        if(!response.success) {
            return res.status(400).json({
                status: "fail",
                message: "Validation Error",
                errors: response.error.flatten().fieldErrors 
            });
        }
        req.body = response.data;
        next();
    } catch(error) {
        return res.status(500).json({
            status: "error",
            message: "Internal Server Error during validation",
            details: error.message
        });
    }
}
