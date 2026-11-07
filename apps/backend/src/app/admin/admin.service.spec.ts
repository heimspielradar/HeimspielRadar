import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  let service: AdminService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {};
    service = new AdminService(mockDb);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('database not configured guards', () => {
    it('throws error in searchMatches when db is null', async () => {
      const unconfiguredService = new AdminService(null);

      await expect(unconfiguredService.searchMatches('test')).rejects.toThrow(
        'Database is not configured!'
      );
    });

    it('throws error in getFeaturedMatches when db is null', async () => {
      const unconfiguredService = new AdminService(null);

      await expect(unconfiguredService.getFeaturedMatches()).rejects.toThrow(
        'Database is not configured!'
      );
    });

    it('throws error in featureMatch when db is null', async () => {
      const unconfiguredService = new AdminService(null);

      await expect(
        unconfiguredService.featureMatch(1, { isFeatured: true })
      ).rejects.toThrow('Database is not configured!');
    });
  });

  describe('featureMatch validation', () => {
    it('throws BadRequestException if isFeatured is missing', async () => {
      // SAFETY: Intentionally passing invalid payload to test validation
      await expect(service.featureMatch(1, {} as any)).rejects.toThrow(
        BadRequestException
      );
    });

    it('throws NotFoundException if match to update does not exist', async () => {
      mockDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(service.featureMatch(999, { isFeatured: true })).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('toggleMatchFeature', () => {
    it('delegates to featureMatch', async () => {
      // SAFETY: Partial mock of Match object for testing delegation
      const spy = jest
        .spyOn(service, 'featureMatch')
        .mockResolvedValue({ id: 1 } as any);

      const result = await service.toggleMatchFeature(1, { isFeatured: true });

      expect(spy).toHaveBeenCalledWith(1, { isFeatured: true });
      expect(result.id).toBe(1);
    });
  });
});
