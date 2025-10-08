## 1) Filosofía y estructura mental

* **Arquitectura en capas**:

  * **Controller**: recibe HTTP, valida/parsea input, decide status codes.
  * **Service**: contiene la lógica de negocio (pura, testeable).
  * **Repository/ORM**: acceso a datos (TypeORM `Repository<T>` u otro).
  * **Module**: agrupa controller(s), provider(s) y wiring de dependencias.
* **Inyección de dependencias (DI)**: todo se obtiene por constructor; evita `new`.
* **Decoradores** (metadatos) para casi todo: rutas, pipes, guards, interceptors.
* **Programación por contrato**: define DTOs y excepciones para que la API sea predecible.

```
Request → Controller (valida, status) → Service (reglas) → Repo (DB)
                                        ↑          ↓
                                  DTOs / Entities  Excepciones
```

---

## 2) Sintaxis esencial (Nest “must know”)

### 2.1 Módulos

```ts
// app.module.ts
@Module({
  imports: [UsersModule, TypeOrmModule.forRoot({...})],
})
export class AppModule {}
```

### 2.2 Controller (HTTP)

```ts
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserDto) { return this.users.create(dto); }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) { return this.users.findOne(id); }
}
```

* Decoradores comunes: `@Body()`, `@Param()`, `@Query()`, `@Headers()`, `@Req()`, `@Res()`.
* Pipes útiles por parámetro: `ParseIntPipe`, `ParseUUIDPipe`.

### 2.3 Service (negocio)

```ts
@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  async create(dto: CreateUserDto) { return this.repo.save(this.repo.create(dto)); }
  findOne(id: number) { return this.repo.findOne({ where: { id } }); }
}
```

### 2.4 DTO + Validación

```ts
export class CreateUserDto {
  @IsEmail() email: string;
  @IsString() @MinLength(3) name: string;
}
```

Habilitar globalmente:

```ts
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
```

* `whitelist`: quita props extra.
* `forbidNonWhitelisted`: 400 si llegan props no permitidas.
* `transform`: convierte tipos (`"1"` → `1` en pipes).

### 2.5 Excepciones (HTTP)

Usa las de Nest (mapean a status code):
`BadRequestException(400)`, `UnauthorizedException(401)`,
`ForbiddenException(403)`, `NotFoundException(404)`,
`ConflictException(409)`, `InternalServerErrorException(500)`.

```ts
if (!user) throw new NotFoundException('User not found');
```

### 2.6 Guards, Interceptors, Filters (mini)

```ts
// Guard: control de acceso
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    return !!req.headers.authorization; // ejemplo simple
  }
}

// Interceptor: transformar respuesta
@Injectable()
export class WrapInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(map(data => ({ data })));
  }
}

// Filter: formatear errores
@Catch(HttpException)
export class HttpFilter implements ExceptionFilter {
  catch(e: HttpException, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    res.status(e.getStatus()).json({ ok: false, error: e.message });
  }
}
```

### 2.7 Configuración/ENV

```ts
npm i @nestjs/config
// app.module.ts
ConfigModule.forRoot({ isGlobal: true });
// usar: process.env.JWT_SECRET
```

### 2.8 TypeORM “snippet pack”

```ts
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) email: string;
  @Column() name: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

// Service
constructor(@InjectRepository(User) private repo: Repository<User>) {}
findAll() { return this.repo.find(); }
findByEmail(email: string) { return this.repo.findOne({ where: { email } }); }
async update(id: string, dto: Partial<User>) {
  const u = await this.repo.findOne({ where: { id } });
  if (!u) return null;
  Object.assign(u, dto);
  return this.repo.save(u);
}
async remove(id: string) { return (await this.repo.delete(id)).affected! > 0; }
```

### 2.9 Transacciones (rápido)

```ts
await this.repo.manager.transaction(async (em) => {
  const userRepo = em.getRepository(User);
  // ... operaciones atómicas
});
```

---

## 3) Flujo de app sano (qué va en cada capa)

* **Controller**:

  * Parseo de inputs → DTOs.
  * Selección de status code (201 en POST, 204 en DELETE).
  * No meter lógica compleja aquí.
* **Service**:

  * Reglas de negocio.
  * Coordinación de múltiples repos.
  * Manejo de casos borde (duplicados, estados inválidos).
* **Repository (ORM)**:

  * Queries específicas.
  * Sin reglas de negocio.
* **DTOs**:

  * Contrato de entrada/salida; validación.
* **Errores**:

  * Lanza excepciones claras; no retornar `null` silencioso (salvo que el test lo pida).
* **Pruebas**:

  * Unit: mockea repos/servicios (foco en lógica).
  * E2E: levanta app, valida endpoints, pipes y status codes.

---

## 4) Comandos útiles (npm ↔️ yarn)

### 4.1 Scripts de proyecto

| Tarea           | npm                      | yarn                   |
| --------------- | ------------------------ | ---------------------- |
| Instalar deps   | `npm i`                  | `yarn`                 |
| Agregar dep     | `npm i paquete`          | `yarn add paquete`     |
| Agregar dep dev | `npm i -D paquete`       | `yarn add -D paquete`  |
| Correr app      | `npm run start`          | `yarn start`           |
| Watch (dev)     | `npm run start:dev`      | `yarn start:dev`       |
| Tests (Jest)    | `npm test`               | `yarn test`            |
| Tests en watch  | `npm test -- --watch`    | `yarn test --watch`    |
| Coverage        | `npm test -- --coverage` | `yarn test --coverage` |
| Lint            | `npm run lint`           | `yarn lint`            |
| Build           | `npm run build`          | `yarn build`           |

### 4.2 Comandos Jest rápidos

* Test por nombre:
  `npm test -- -t "UsersController"` / `yarn test -t "UsersController"`
* Test de un archivo:
  `npm test -- test/users.controller.spec.ts` / `yarn test test/users.controller.spec.ts`
* Actualizar snapshots:
  `npm test -- -u` / `yarn test -u`

---

## 5) Nest CLI (generadores que ahorran tiempo)

> Instalar global (opcional): `npm i -g @nestjs/cli` / `yarn global add @nestjs/cli`

| Generar…          | Comando (Nest CLI)                            |
| ----------------- | --------------------------------------------- |
| Proyecto          | `nest new app-name`                           |
| Módulo            | `nest g module users`                         |
| Service           | `nest g service users`                        |
| Controller        | `nest g controller users --flat`              |
| Resource (REST)   | `nest g resource users` (te guía y crea todo) |
| Guard             | `nest g guard auth`                           |
| Pipe              | `nest g pipe parse-int`                       |
| Interceptor       | `nest g interceptor wrap`                     |
| Filter            | `nest g filter http-exception`                |
| Middleware        | `nest g middleware logger`                    |
| Provider genérico | `nest g provider payments`                    |

> Flags útiles: `--no-spec` (sin test), `--flat` (sin carpeta extra), `--dry-run`.

---

## 6) TypeORM + Postgres (setup exprés)

```ts
// app.module.ts
TypeOrmModule.forRoot({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: +(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
  database: process.env.DB_NAME || 'appdb',
  autoLoadEntities: true,
  synchronize: true, // ✅ Examen/demo | ❌ Producción
});
```

* Inyectar repos: `TypeOrmModule.forFeature([User, Book])`.
* Para **migraciones** (si las usas): usa CLI de TypeORM o scripts `typeorm migration:generate` y `migration:run` (en examen, muchas veces basta `synchronize:true`).

---

## 7) Autenticación mínima (JWT + bcrypt)

```ts
// login (controller)
const user = await this.users.findByEmail(dto.email);
if (!user) throw new NotFoundException('User not found');
const ok = await bcrypt.compare(dto.password, user.password);
if (!ok) throw new UnauthorizedException('Invalid credentials');
return this.users.issueToken(user.id);

// service
constructor(private jwt: JwtService) {}
issueToken(sub: string) { return { token: this.jwt.sign({ sub }) }; }

// guard (opcional)
@Injectable()
export class JwtGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new UnauthorizedException();
    // verificar token con JwtService si quieres
    return true;
  }
}
```

---

## 8) Errores comunes que rompen tests

* **Status code incorrecto** (201 vs 200, 204 sin body).
* No lanzar **`NotFoundException`** cuando corresponde.
* No activar `ValidationPipe` y fallar en payloads.
* Mutar arrays/objetos en vez de devolver copias (si comparan referencias).
* No usar `ParseIntPipe`/`ParseUUIDPipe`: `id` llega como string y el servicio espera number.
* Mensajes **exactos**: `"User already exists"`, `"Invalid credentials"`, etc.

---

## 9) Bonus: Swagger en 30s (si te dejan)

```ts
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const config = new DocumentBuilder().setTitle('API').setVersion('1.0').build();
const doc = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('docs', app, doc);
```

---

## 10) Checklist antes de correr tests

* [ ] Nombres/exports exactos como los usa el test.
* [ ] `ValidationPipe` global si validan DTOs.
* [ ] Excepciones correctas con mensajes iguales.
* [ ] DTOs con validaciones y tipos precisos.
* [ ] Métodos `async` si el test usa `await`.
* [ ] Repos inyectados con `@InjectRepository(Entidad)`.
* [ ] Endpoints con status y shape que esperan (201/204/404/401/500).

---

## 11) Equivalencias Node (Express/Mongoose) → Nest (TypeORM)

* `router.get('/users')` → `@Get('users')`.
* `Model.find()` → `repo.find()`.
* `Model.findById(id)` → `repo.findOne({ where: { id } })`.
* `Model.create(doc)` → `repo.save(repo.create(doc))`.
* `findByIdAndUpdate` → `findOne` + `Object.assign` + `save`.
* `_id` (Mongo) → `id` (UUID) con `@PrimaryGeneratedColumn('uuid')`.

