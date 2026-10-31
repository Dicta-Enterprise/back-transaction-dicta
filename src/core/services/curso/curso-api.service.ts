import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CursoResponse {
  id: string;
  nombre: string;
  precio: number;
}

interface RespuestaCatalogo {
  data?: { isSuccess?: boolean; _value?: { id: string; nombre: string; precio: number } };
}

const TIMEOUT_MS = 8000;

/** Consulta el catálogo de cursos (back-nest) para conocer el precio real: el precio nunca se toma del cliente. */
@Injectable()
export class CursoApiService {
  private readonly logger = new Logger(CursoApiService.name);
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('CURSO_API_URL', 'http://localhost:3000');
  }

  async obtenerCurso(idcurso: string): Promise<CursoResponse> {
    let body: RespuestaCatalogo;

    try {
      const response = await fetch(`${this.baseUrl}/api/cursos/${encodeURIComponent(idcurso)}`, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (response.status === 404) {
        throw new NotFoundException(`El curso ${idcurso} no existe`);
      }

      // El catálogo responde 400 (no 404) cuando el curso no existe, envolviendo el resultado en data._value.
      if (!response.ok && response.status !== 400) {
        throw new InternalServerErrorException('Error consultando el catálogo de cursos');
      }

      body = (await response.json()) as RespuestaCatalogo;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof InternalServerErrorException) {
        throw error;
      }

      this.logger.error(`No se pudo consultar el catálogo de cursos: ${(error as Error).message}`);
      throw new BadRequestException(
        'No se pudo conectar con el catálogo de cursos. No se puede procesar el pago sin verificar el precio real.',
      );
    }

    if (!body.data?.isSuccess || !body.data._value) {
      throw new NotFoundException(`El curso ${idcurso} no existe`);
    }

    const curso = body.data._value;
    return { id: curso.id, nombre: curso.nombre, precio: curso.precio };
  }
}
