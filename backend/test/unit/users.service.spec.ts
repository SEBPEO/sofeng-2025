import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../../src/users/users.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { UpdateProfileDto } from '../../src/users/dto/update-profile.dto';
import { Role, Gender } from '@prisma/client';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: PrismaService;

  // Mock data factories
  const createMockUser = (overrides?: any) => ({
    user_id: 'user-123',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    gender: 'male' as Gender,
    role: 'patient' as Role,
    createdAt: new Date('2024-01-01'),
    lastLogin: null,
    ...overrides,
  });

  const createMockDoctorProfile = (overrides?: any) => ({
    doctor_id: 1,
    user_id: 'user-123',
    specialization: 'Cardiology',
    experience_years: 10,
    clinic_address: '123 Main St',
    contact_info: '+1234567890',
    working_hours: '9am-5pm',
    ...overrides,
  });

  const createMockPatientProfile = (overrides?: any) => ({
    patient_id: 1,
    user_id: 'user-123',
    date_of_birth: new Date('1990-01-01'),
    emergency_contact: '+1234567890',
    conditions: 'Hypertension',
    medications: 'Aspirin',
    allergy: 'Penicillin',
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            doctorProfile: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            patientProfile: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByIdWithProfiles', () => {
    it('should return user with doctor profile when doctor profile exists', async () => {
      const mockUser = createMockUser({ role: 'doctor' });
      const mockDoctorProfile = createMockDoctorProfile();

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        doctor_profile: mockDoctorProfile,
        patient_profile: null,
      });

      const result = await service.findByIdWithProfiles('user-123');

      expect(result).toBeDefined();
      expect(result?.user_id).toBe('user-123');
      expect(result?.doctor_profile).toEqual(mockDoctorProfile);
      expect(result?.patient_profile).toBeNull();
      expect(result?.profileCompleted).toBe(true);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { user_id: 'user-123' },
        include: {
          doctor_profile: true,
          patient_profile: true,
        },
      });
    });

    it('should return user with patient profile when patient profile exists', async () => {
      const mockUser = createMockUser({ role: 'patient' });
      const mockPatientProfile = createMockPatientProfile();

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        doctor_profile: null,
        patient_profile: mockPatientProfile,
      });

      const result = await service.findByIdWithProfiles('user-123');

      expect(result).toBeDefined();
      expect(result?.user_id).toBe('user-123');
      expect(result?.patient_profile).toEqual(mockPatientProfile);
      expect(result?.doctor_profile).toBeNull();
      expect(result?.profileCompleted).toBe(true);
    });

    it('should return user with both profiles if applicable', async () => {
      const mockUser = createMockUser({ role: 'doctor' });
      const mockDoctorProfile = createMockDoctorProfile();
      const mockPatientProfile = createMockPatientProfile();

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        doctor_profile: mockDoctorProfile,
        patient_profile: mockPatientProfile,
      });

      const result = await service.findByIdWithProfiles('user-123');

      expect(result).toBeDefined();
      expect(result?.doctor_profile).toEqual(mockDoctorProfile);
      expect(result?.patient_profile).toEqual(mockPatientProfile);
      expect(result?.profileCompleted).toBe(true);
    });

    it('should return null when user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.findByIdWithProfiles('non-existent');

      expect(result).toBeNull();
    });

    it('should correctly map to UserResponseDto with profileCompleted flag', async () => {
      const mockUser = createMockUser();
      const mockPatientProfile = createMockPatientProfile();

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        doctor_profile: null,
        patient_profile: mockPatientProfile,
      });

      const result = await service.findByIdWithProfiles('user-123');

      expect(result).toMatchObject({
        user_id: mockUser.user_id,
        first_name: mockUser.first_name,
        last_name: mockUser.last_name,
        gender: mockUser.gender,
        email: mockUser.email,
        role: mockUser.role,
        createdAt: mockUser.createdAt,
        lastLogin: mockUser.lastLogin,
        profileCompleted: true,
        patient_profile: mockPatientProfile,
      });
    });

    it('should set profileCompleted to false when no profile exists', async () => {
      const mockUser = createMockUser();

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        doctor_profile: null,
        patient_profile: null,
      });

      const result = await service.findByIdWithProfiles('user-123');

      expect(result?.profileCompleted).toBe(false);
    });
  });

  describe('updateProfile - Doctor Profile', () => {
    it('should create new doctor profile when user has no profile', async () => {
      const mockUser = createMockUser({ role: 'doctor' });
      const updateDto: UpdateProfileDto = {
        role: 'doctor',
        specialization: 'Cardiology',
        clinic_address: '123 Main St',
        experience_years: 10,
        contact_info: '+1234567890',
        working_hours: '9am-5pm',
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockUser,
        doctor_profile: null,
        patient_profile: null,
      });

      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        role: 'doctor',
        doctor_profile: null,
        patient_profile: null,
      });

      (prismaService.doctorProfile.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.doctorProfile.findFirst as jest.Mock).mockResolvedValue(null);

      const createdProfile = createMockDoctorProfile();
      (prismaService.doctorProfile.create as jest.Mock).mockResolvedValue(createdProfile);

      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockUser,
        role: 'doctor',
        doctor_profile: createdProfile,
        patient_profile: null,
      });

      const result = await service.updateProfile('user-123', updateDto);

      expect(result).toBeDefined();
      expect(result?.role).toBe('doctor');
      expect(result?.doctor_profile).toBeDefined();
      expect(prismaService.doctorProfile.create).toHaveBeenCalled();
      expect(prismaService.doctorProfile.update).not.toHaveBeenCalled();
    });

    it('should update existing doctor profile', async () => {
      const mockUser = createMockUser({ role: 'doctor' });
      const existingProfile = createMockDoctorProfile();
      const updateDto: UpdateProfileDto = {
        specialization: 'Neurology',
        clinic_address: '456 Oak Ave',
        experience_years: 15,
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockUser,
        doctor_profile: existingProfile,
        patient_profile: null,
      });

      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        doctor_profile: existingProfile,
        patient_profile: null,
      });

      (prismaService.doctorProfile.findUnique as jest.Mock).mockResolvedValue(existingProfile);
      (prismaService.doctorProfile.update as jest.Mock).mockResolvedValue({
        ...existingProfile,
        ...updateDto,
      });

      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockUser,
        doctor_profile: { ...existingProfile, ...updateDto },
        patient_profile: null,
      });

      const result = await service.updateProfile('user-123', updateDto);

      expect(result).toBeDefined();
      expect(prismaService.doctorProfile.update).toHaveBeenCalledWith({
        where: { user_id: 'user-123' },
        data: {
          specialization: updateDto.specialization,
          experience_years: updateDto.experience_years,
          clinic_address: updateDto.clinic_address,
          contact_info: updateDto.contact_info,
          working_hours: updateDto.working_hours,
        },
      });
      expect(prismaService.doctorProfile.create).not.toHaveBeenCalled();
    });

    it('should reject role change when profile already exists', async () => {
      const mockUser = createMockUser({ role: 'doctor' });
      const existingProfile = createMockDoctorProfile();
      const updateDto: UpdateProfileDto = {
        role: 'patient',
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        doctor_profile: existingProfile,
        patient_profile: null,
      });

      await expect(service.updateProfile('user-123', updateDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.updateProfile('user-123', updateDto)).rejects.toThrow(
        'Role cannot be changed after registration',
      );
    });

    it('should require specialization and clinic_address for doctor', async () => {
      const mockUser = createMockUser({ role: 'doctor' });
      const updateDto: UpdateProfileDto = {
        role: 'doctor',
        specialization: 'Cardiology',
        // Missing clinic_address
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockUser,
        doctor_profile: null,
        patient_profile: null,
      });

      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        role: 'doctor',
        doctor_profile: null,
        patient_profile: null,
      });

      const error = await service.updateProfile('user-123', updateDto).catch((e) => e);
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toBe('Specialization and clinic address are required for doctors');
    });

    it('should auto-increment doctor_id for new profiles', async () => {
      const mockUser = createMockUser({ role: 'doctor' });
      const updateDto: UpdateProfileDto = {
        role: 'doctor',
        specialization: 'Cardiology',
        clinic_address: '123 Main St',
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockUser,
        doctor_profile: null,
        patient_profile: null,
      });

      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        role: 'doctor',
        doctor_profile: null,
        patient_profile: null,
      });

      (prismaService.doctorProfile.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.doctorProfile.findFirst as jest.Mock).mockResolvedValue({
        doctor_id: 5,
      });

      const createdProfile = createMockDoctorProfile({ doctor_id: 6 });
      (prismaService.doctorProfile.create as jest.Mock).mockResolvedValue(createdProfile);

      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockUser,
        role: 'doctor',
        doctor_profile: createdProfile,
        patient_profile: null,
      });

      await service.updateProfile('user-123', updateDto);

      expect(prismaService.doctorProfile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          doctor_id: 6,
          user_id: 'user-123',
        }),
      });
    });

    it('should update user basic info (first_name, last_name, gender)', async () => {
      const mockUser = createMockUser({ role: 'doctor' });
      const existingProfile = createMockDoctorProfile();
      const updateDto: UpdateProfileDto = {
        first_name: 'Jane',
        last_name: 'Smith',
        gender: 'female',
        specialization: 'Cardiology',
        clinic_address: '123 Main St',
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockUser,
        doctor_profile: existingProfile,
        patient_profile: null,
      });

      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        first_name: 'Jane',
        last_name: 'Smith',
        gender: 'female',
        doctor_profile: existingProfile,
        patient_profile: null,
      });

      (prismaService.doctorProfile.findUnique as jest.Mock).mockResolvedValue(existingProfile);
      (prismaService.doctorProfile.update as jest.Mock).mockResolvedValue(existingProfile);

      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockUser,
        first_name: 'Jane',
        last_name: 'Smith',
        gender: 'female',
        doctor_profile: existingProfile,
        patient_profile: null,
      });

      const result = await service.updateProfile('user-123', updateDto);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { user_id: 'user-123' },
        data: {
          first_name: 'Jane',
          last_name: 'Smith',
          gender: 'female',
        },
        include: {
          doctor_profile: true,
          patient_profile: true,
        },
      });
      expect(result?.first_name).toBe('Jane');
      expect(result?.last_name).toBe('Smith');
      expect(result?.gender).toBe('female');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      const updateDto: UpdateProfileDto = {
        role: 'doctor',
        specialization: 'Cardiology',
        clinic_address: '123 Main St',
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.updateProfile('non-existent', updateDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.updateProfile('non-existent', updateDto)).rejects.toThrow(
        'User not found',
      );
    });

    it('should throw BadRequestException when role is required but missing', async () => {
      const mockUser = createMockUser();
      const updateDto: UpdateProfileDto = {
        first_name: 'Jane',
        // No role provided and user has no profile
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        doctor_profile: null,
        patient_profile: null,
      });

      await expect(service.updateProfile('user-123', updateDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.updateProfile('user-123', updateDto)).rejects.toThrow(
        'Role is required',
      );
    });
  });

  describe('updateProfile - Patient Profile', () => {
    it('should create new patient profile when user has no profile', async () => {
      const mockUser = createMockUser({ role: 'patient' });
      const updateDto: UpdateProfileDto = {
        role: 'patient',
        date_of_birth: '1990-01-01',
        emergency_contact: '+1234567890',
        conditions: 'Hypertension',
        medications: 'Aspirin',
        allergy: 'Penicillin',
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockUser,
        doctor_profile: null,
        patient_profile: null,
      });

      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        role: 'patient',
        doctor_profile: null,
        patient_profile: null,
      });

      (prismaService.patientProfile.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.patientProfile.findFirst as jest.Mock).mockResolvedValue(null);

      const createdProfile = createMockPatientProfile();
      (prismaService.patientProfile.create as jest.Mock).mockResolvedValue(createdProfile);

      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockUser,
        role: 'patient',
        doctor_profile: null,
        patient_profile: createdProfile,
      });

      const result = await service.updateProfile('user-123', updateDto);

      expect(result).toBeDefined();
      expect(result?.role).toBe('patient');
      expect(result?.patient_profile).toBeDefined();
      expect(prismaService.patientProfile.create).toHaveBeenCalled();
      expect(prismaService.patientProfile.update).not.toHaveBeenCalled();
    });

    it('should update existing patient profile', async () => {
      const mockUser = createMockUser({ role: 'patient' });
      const existingProfile = createMockPatientProfile();
      const updateDto: UpdateProfileDto = {
        conditions: 'Diabetes',
        medications: 'Metformin',
        allergy: 'Sulfa',
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockUser,
        doctor_profile: null,
        patient_profile: existingProfile,
      });

      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        doctor_profile: null,
        patient_profile: existingProfile,
      });

      (prismaService.patientProfile.findUnique as jest.Mock).mockResolvedValue(existingProfile);
      (prismaService.patientProfile.update as jest.Mock).mockResolvedValue({
        ...existingProfile,
        ...updateDto,
      });

      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockUser,
        doctor_profile: null,
        patient_profile: { ...existingProfile, ...updateDto },
      });

      const result = await service.updateProfile('user-123', updateDto);

      expect(result).toBeDefined();
      expect(prismaService.patientProfile.update).toHaveBeenCalledWith({
        where: { user_id: 'user-123' },
        data: {
          date_of_birth: null,
          emergency_contact: updateDto.emergency_contact,
          conditions: updateDto.conditions,
          medications: updateDto.medications,
          allergy: updateDto.allergy,
        },
      });
      expect(prismaService.patientProfile.create).not.toHaveBeenCalled();
    });

    it('should reject role change when profile already exists', async () => {
      const mockUser = createMockUser({ role: 'patient' });
      const existingProfile = createMockPatientProfile();
      const updateDto: UpdateProfileDto = {
        role: 'doctor',
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        doctor_profile: null,
        patient_profile: existingProfile,
      });

      await expect(service.updateProfile('user-123', updateDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.updateProfile('user-123', updateDto)).rejects.toThrow(
        'Role cannot be changed after registration',
      );
    });

    it('should handle optional patient fields', async () => {
      const mockUser = createMockUser({ role: 'patient' });
      const updateDto: UpdateProfileDto = {
        role: 'patient',
        date_of_birth: '1990-01-01',
        emergency_contact: '+1234567890',
        // Optional fields can be omitted
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockUser,
        doctor_profile: null,
        patient_profile: null,
      });

      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        role: 'patient',
        doctor_profile: null,
        patient_profile: null,
      });

      (prismaService.patientProfile.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.patientProfile.findFirst as jest.Mock).mockResolvedValue(null);

      const createdProfile = createMockPatientProfile({
        conditions: null,
        medications: null,
        allergy: null,
      });
      (prismaService.patientProfile.create as jest.Mock).mockResolvedValue(createdProfile);

      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockUser,
        role: 'patient',
        doctor_profile: null,
        patient_profile: createdProfile,
      });

      await service.updateProfile('user-123', updateDto);

      // When optional fields are omitted from DTO, they are undefined, not null
      expect(prismaService.patientProfile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          patient_id: expect.any(Number),
          user_id: 'user-123',
          date_of_birth: new Date('1990-01-01'),
          emergency_contact: '+1234567890',
          conditions: undefined,
          medications: undefined,
          allergy: undefined,
        }),
      });
    });

    it('should auto-increment patient_id for new profiles', async () => {
      const mockUser = createMockUser({ role: 'patient' });
      const updateDto: UpdateProfileDto = {
        role: 'patient',
        date_of_birth: '1990-01-01',
        emergency_contact: '+1234567890',
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockUser,
        doctor_profile: null,
        patient_profile: null,
      });

      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        role: 'patient',
        doctor_profile: null,
        patient_profile: null,
      });

      (prismaService.patientProfile.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.patientProfile.findFirst as jest.Mock).mockResolvedValue({
        patient_id: 3,
      });

      const createdProfile = createMockPatientProfile({ patient_id: 4 });
      (prismaService.patientProfile.create as jest.Mock).mockResolvedValue(createdProfile);

      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockUser,
        role: 'patient',
        doctor_profile: null,
        patient_profile: createdProfile,
      });

      await service.updateProfile('user-123', updateDto);

      expect(prismaService.patientProfile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          patient_id: 4,
          user_id: 'user-123',
        }),
      });
    });

    it('should update user basic info', async () => {
      const mockUser = createMockUser({ role: 'patient' });
      const existingProfile = createMockPatientProfile();
      const updateDto: UpdateProfileDto = {
        first_name: 'Jane',
        last_name: 'Smith',
        gender: 'female',
        date_of_birth: '1990-01-01',
        emergency_contact: '+1234567890',
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockUser,
        doctor_profile: null,
        patient_profile: existingProfile,
      });

      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        first_name: 'Jane',
        last_name: 'Smith',
        gender: 'female',
        doctor_profile: null,
        patient_profile: existingProfile,
      });

      (prismaService.patientProfile.findUnique as jest.Mock).mockResolvedValue(existingProfile);
      (prismaService.patientProfile.update as jest.Mock).mockResolvedValue(existingProfile);

      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockUser,
        first_name: 'Jane',
        last_name: 'Smith',
        gender: 'female',
        doctor_profile: null,
        patient_profile: existingProfile,
      });

      const result = await service.updateProfile('user-123', updateDto);

      expect(result?.first_name).toBe('Jane');
      expect(result?.last_name).toBe('Smith');
      expect(result?.gender).toBe('female');
    });

    it('should convert date_of_birth string to Date object', async () => {
      const mockUser = createMockUser({ role: 'patient' });
      const updateDto: UpdateProfileDto = {
        role: 'patient',
        date_of_birth: '1990-05-15',
        emergency_contact: '+1234567890',
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockUser,
        doctor_profile: null,
        patient_profile: null,
      });

      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        role: 'patient',
        doctor_profile: null,
        patient_profile: null,
      });

      (prismaService.patientProfile.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.patientProfile.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.patientProfile.create as jest.Mock).mockResolvedValue(
        createMockPatientProfile(),
      );

      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockUser,
        role: 'patient',
        doctor_profile: null,
        patient_profile: createMockPatientProfile(),
      });

      await service.updateProfile('user-123', updateDto);

      expect(prismaService.patientProfile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          date_of_birth: new Date('1990-05-15'),
        }),
      });
    });
  });

  describe('mapToUserResponse', () => {
    it('should correctly set profileCompleted flag', async () => {
      const mockUser = createMockUser();
      const mockPatientProfile = createMockPatientProfile();

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        doctor_profile: null,
        patient_profile: mockPatientProfile,
      });

      const result = await service.findByIdWithProfiles('user-123');

      expect(result?.profileCompleted).toBe(true);
    });

    it('should include doctor_profile when present', async () => {
      const mockUser = createMockUser({ role: 'doctor' });
      const mockDoctorProfile = createMockDoctorProfile();

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        doctor_profile: mockDoctorProfile,
        patient_profile: null,
      });

      const result = await service.findByIdWithProfiles('user-123');

      expect(result?.doctor_profile).toEqual(mockDoctorProfile);
    });

    it('should include patient_profile when present', async () => {
      const mockUser = createMockUser({ role: 'patient' });
      const mockPatientProfile = createMockPatientProfile();

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        doctor_profile: null,
        patient_profile: mockPatientProfile,
      });

      const result = await service.findByIdWithProfiles('user-123');

      expect(result?.patient_profile).toEqual(mockPatientProfile);
    });

    it('should handle null profiles correctly', async () => {
      const mockUser = createMockUser();

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        doctor_profile: null,
        patient_profile: null,
      });

      const result = await service.findByIdWithProfiles('user-123');

      expect(result?.doctor_profile).toBeNull();
      expect(result?.patient_profile).toBeNull();
      expect(result?.profileCompleted).toBe(false);
    });
  });
});
