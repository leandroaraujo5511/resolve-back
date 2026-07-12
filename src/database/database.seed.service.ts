import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { City } from './entities/city.entity';
import { Department } from './entities/department.entity';
import { Neighborhood } from './entities/neighborhood.entity';
import { Ticket } from './entities/ticket.entity';
import { TicketHistory } from './entities/ticket-history.entity';
import { TicketPriority, TicketStatus } from './entities/ticket.enums';
import { User, UserRole } from './entities/user.entity';

@Injectable()
export class DatabaseSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseSeedService.name);

  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(TicketHistory)
    private readonly ticketHistoryRepository: Repository<TicketHistory>,
    @InjectRepository(City)
    private readonly cityRepository: Repository<City>,
    @InjectRepository(Neighborhood)
    private readonly neighborhoodRepository: Repository<Neighborhood>,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    let company = await this.companyRepository.findOne({
      where: { slug: 'default-company' },
    });

    if (!company) {
      company = this.companyRepository.create({
        name: this.configService.get<string>('SEED_COMPANY_NAME', 'Município Demo'),
        slug: 'default-company',
        status: 'ativo',
      });
      company = await this.companyRepository.save(company);
    }

    await this.seedDefaultCities();
    await this.ensureCompanyCity(company);
    await this.seedDefaultDepartments(company.id);
    await this.linkMeioAmbienteToSaoPaulo(company.id);
    await this.seedNeighborhoods();

    const adminEmail = this.configService.get<string>(
      'SEED_ADMIN_EMAIL',
      'admin@resolve.local',
    );

    let admin = await this.userRepository.findOne({
      where: { email: adminEmail },
    });

    if (!admin) {
      const plainPassword = this.configService.get<string>(
        'SEED_ADMIN_PASSWORD',
        'Admin@123',
      );
      const passwordHash = await bcrypt.hash(plainPassword, 10);

      admin = this.userRepository.create({
        companyId: company.id,
        name: this.configService.get<string>('SEED_ADMIN_NAME', 'Administrador Resolve'),
        email: adminEmail,
        phone: this.configService.get<string>('SEED_ADMIN_PHONE', '11999990000'),
        role: UserRole.ADMIN,
        status: 'ativo',
        passwordHash,
      });
      admin = await this.userRepository.save(admin);
      this.logger.log(`Admin seeded: ${adminEmail}`);
    }

    const superEmailRaw = this.configService.get<string>('SEED_SUPER_ADMIN_EMAIL');
    if (superEmailRaw?.trim()) {
      const superEmail = superEmailRaw.trim().toLowerCase();
      let superUser = await this.userRepository.findOne({ where: { email: superEmail } });
      if (!superUser) {
        const plainPassword = this.configService.get<string>(
          'SEED_SUPER_ADMIN_PASSWORD',
          'SuperAdmin@123',
        );
        const passwordHash = await bcrypt.hash(plainPassword, 10);
        superUser = this.userRepository.create({
          companyId: null,
          name: this.configService.get<string>(
            'SEED_SUPER_ADMIN_NAME',
            'Super Administrador',
          ),
          email: superEmail,
          phone: this.configService.get<string>(
            'SEED_SUPER_ADMIN_PHONE',
            '11988887777',
          ),
          role: UserRole.SUPER_ADMIN,
          status: 'ativo',
          passwordHash,
        });
        await this.userRepository.save(superUser);
        this.logger.log(`Super admin seeded: ${superEmail}`);
      }
    }

    await this.seedSampleTickets(company.id, admin.id);
  }

  private async seedDefaultDepartments(companyId: string): Promise<void> {
    const defaults: Array<
      Pick<Department, 'name' | 'description' | 'status' | 'icon'>
    > = [
      {
        name: 'Obras e Infraestrutura',
        description:
          'Responsável por obras públicas, manutenção de vias e infraestrutura urbana.',
        status: 'ativo',
        icon: 'construct-outline',
      },
      {
        name: 'Saúde',
        description:
          'Gestão de unidades de saúde, postos e atendimento ao cidadão.',
        status: 'ativo',
        icon: 'medkit-outline',
      },
      {
        name: 'Educação',
        description:
          'Administração de escolas municipais e programas educacionais.',
        status: 'ativo',
        icon: 'school-outline',
      },
      {
        name: 'Meio Ambiente',
        description: 'Fiscalização ambiental, coleta seletiva e áreas verdes.',
        status: 'ativo',
        icon: 'leaf-outline',
      },
    ];

    for (const item of defaults) {
      const exists = await this.departmentRepository.findOne({
        where: { companyId, name: item.name },
      });
      if (exists) {
        continue;
      }
      const department = this.departmentRepository.create({
        companyId,
        name: item.name,
        description: item.description,
        status: item.status,
        icon: item.icon ?? null,
      });
      await this.departmentRepository.save(department);
    }
  }

  /** "Meio Ambiente" só aparece para cidadãos de São Paulo (demo). */
  private async linkMeioAmbienteToSaoPaulo(companyId: string): Promise<void> {
    const sp = await this.cityRepository.findOne({
      where: { name: 'São Paulo', stateUf: 'SP' },
    });
    const meio = await this.departmentRepository.findOne({
      where: { companyId, name: 'Meio Ambiente' },
    });
    if (sp && meio && meio.visibleOnlyInCityId == null) {
      meio.visibleOnlyInCityId = sp.id;
      await this.departmentRepository.save(meio);
      this.logger.log('Meio Ambiente vinculado à cidade de São Paulo (demo).');
    }
  }

  private async seedNeighborhoods(): Promise<void> {
    const cities = await this.cityRepository.find();
    const names = ['Centro', 'Zona Norte', 'Zona Sul'];

    for (const city of cities) {
      const count = await this.neighborhoodRepository.count({
        where: { cityId: city.id },
      });
      if (count > 0) {
        continue;
      }
      for (const name of names) {
        await this.neighborhoodRepository.save(
          this.neighborhoodRepository.create({
            cityId: city.id,
            name,
            status: 'ativo',
          }),
        );
      }
    }
  }

  private async seedSampleTickets(
    companyId: string,
    adminUserId: string,
  ): Promise<void> {
    const existing = await this.ticketRepository.count({ where: { companyId } });
    if (existing > 0) {
      return;
    }

    const dept = await this.departmentRepository.findOne({
      where: { companyId, name: 'Obras e Infraestrutura' },
    });

    if (!dept) {
      this.logger.warn('Skip ticket seed: department not found');
      return;
    }

    const spCity = await this.cityRepository.findOne({
      where: { name: 'São Paulo', stateUf: 'SP' },
    });

    const year = new Date().getFullYear();

    const samples: Array<{
      protocol: string;
      title: string;
      shortDescription: string;
      detailedDescription: string;
      status: TicketStatus;
      priority: TicketPriority;
      citizenName: string;
      citizenPhone: string;
      location: string;
      history: Array<{
        status: TicketStatus;
        comment: string;
        isInternal: boolean;
      }>;
    }> = [
      {
        protocol: `${year}-000001`,
        title: 'Buraco na Rua das Flores',
        shortDescription: 'Buraco grande na via principal do bairro.',
        detailedDescription:
          'Existe um buraco de aproximadamente 2 metros de diâmetro na Rua das Flores, número 450.',
        status: TicketStatus.ABERTO,
        priority: TicketPriority.ALTA,
        citizenName: 'José da Silva',
        citizenPhone: '11987654321',
        location: 'Rua das Flores, 450 - Centro',
        history: [
          {
            status: TicketStatus.ABERTO,
            comment: 'Chamado criado pelo cidadão via aplicativo.',
            isInternal: false,
          },
        ],
      },
      {
        protocol: `${year}-000002`,
        title: 'Falta de iluminação na Praça Central',
        shortDescription: 'Lâmpadas queimadas na praça.',
        detailedDescription:
          'Três postes de iluminação estão com lâmpadas queimadas na Praça Central.',
        status: TicketStatus.EM_ANDAMENTO,
        priority: TicketPriority.MEDIA,
        citizenName: 'Ana Oliveira',
        citizenPhone: '11912345678',
        location: 'Praça Central - Centro',
        history: [
          {
            status: TicketStatus.ABERTO,
            comment: 'Chamado criado.',
            isInternal: false,
          },
          {
            status: TicketStatus.EM_ANDAMENTO,
            comment: 'Equipe designada para reparo.',
            isInternal: false,
          },
          {
            status: TicketStatus.EM_ANDAMENTO,
            comment: 'Nota interna: priorizar após feriado.',
            isInternal: true,
          },
        ],
      },
    ];

    for (const row of samples) {
      const ticket = this.ticketRepository.create({
        companyId,
        cityId: spCity?.id ?? null,
        citizenId: null,
        departmentId: dept.id,
        protocol: row.protocol,
        title: row.title,
        shortDescription: row.shortDescription,
        detailedDescription: row.detailedDescription,
        status: row.status,
        priority: row.priority,
        citizenName: row.citizenName,
        citizenPhone: row.citizenPhone,
        location: row.location,
        neighborhoodId: null,
        addressLine: null,
        addressComplement: null,
        latitude: null,
        longitude: null,
        attachments: [],
      });
      const saved = await this.ticketRepository.save(ticket);

      for (const h of row.history) {
        const hist = this.ticketHistoryRepository.create({
          ticketId: saved.id,
          status: h.status,
          comment: h.comment,
          userId: adminUserId,
          citizenId: null,
          isInternal: h.isInternal,
          actorType: 'USER',
          actorDisplayName: this.configService.get<string>(
            'SEED_ADMIN_NAME',
            'Administrador Resolve',
          ),
        });
        await this.ticketHistoryRepository.save(hist);
      }
    }

    this.logger.log(`Sample tickets seeded for company ${companyId}`);
  }

  /** Vincula tenant demo a São Paulo para escopo de bairros no painel ADMIN. */
  private async ensureCompanyCity(company: Company): Promise<void> {
    if (company.cityId) {
      return;
    }
    const sp = await this.cityRepository.findOne({
      where: { name: 'São Paulo', stateUf: 'SP' },
    });
    if (!sp) {
      return;
    }
    company.cityId = sp.id;
    await this.companyRepository.save(company);
    this.logger.log('Empresa demo vinculada ao município São Paulo/SP.');
  }

  private async seedDefaultCities(): Promise<void> {
    const defaults: Array<{ name: string; stateUf: string }> = [
      { name: 'São Paulo', stateUf: 'SP' },
      { name: 'Rio de Janeiro', stateUf: 'RJ' },
      { name: 'Belo Horizonte', stateUf: 'MG' },
      { name: 'Curitiba', stateUf: 'PR' },
      { name: 'Porto Alegre', stateUf: 'RS' },
      { name: 'Salvador', stateUf: 'BA' },
    ];

    for (const row of defaults) {
      const name = row.name.trim();
      const stateUf = row.stateUf.trim().toUpperCase();
      const exists = await this.cityRepository.findOne({
        where: { name, stateUf },
      });
      if (exists) {
        continue;
      }
      await this.cityRepository.save(
        this.cityRepository.create({
          name,
          stateUf,
          status: 'ativo',
        }),
      );
    }
  }
}
