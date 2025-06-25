# JobBoard

![image](https://github.com/user-attachments/assets/27ee77af-820c-4ed5-b4d3-a7db35e4368e)

![image](https://github.com/user-attachments/assets/a04053dc-ad33-475a-bf71-1dea475c33af)

![image](https://github.com/user-attachments/assets/2ece1815-4e4e-46d5-bb83-707f379f3635)

![image](https://github.com/user-attachments/assets/9b82ef4f-b3e1-42ae-aa18-dbf8e8b783ee)




This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.14.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Start JSON Server

```bash
npx json-server db.json --port 3000 --watch
```

## User Roles & Authentication

This application supports three distinct user roles:

### 1. Job Seekers 👤

- **Purpose**: Users who apply for job positions
- **Registration**: Available through signup form
- **Access**: Apply for jobs, manage applications, profile management
- **Dashboard**: `/dashboard`

### 2. Companies 🏢

- **Purpose**: Organizations that post job listings
- **Registration**: Available through signup form
- **Access**: Create and manage job postings, company profile management
- **Dashboard**: `/company/dashboard`

### 3. Administrators 👨‍💼

- **Purpose**: Platform administrators with full system access
- **Registration**: ❌ **NOT AVAILABLE** - Admin accounts are pre-created in database
- **Access**: Full platform management, user management, content moderation
- **Dashboard**: `/admin/dashboard`

## Pre-configured Admin Accounts

Admin accounts are managed by system administrators and cannot be created through the registration form. Use these pre-configured accounts for testing:

### Primary Admin Account

- **Email**: `admin@demo.com`
- **Password**: `password123`
- **Name**: Admin User
- **Access**: Full administrative privileges

### Super Admin Account

- **Email**: `superadmin@jobboard.com`
- **Password**: `SuperAdmin123!`
- **Name**: Super Admin
- **Access**: Full administrative privileges

## Demo Accounts

### Job Seeker Demo Account

- **Email**: `jobseeker@demo.com`
- **Password**: `password123`
- **Name**: John Doe

### Company Demo Account

- **Email**: `company@demo.com`
- **Password**: `Company@123`
- **Name**: Company Representative
- **Company**: Demo Tech Solutions

### Admin Demo Account

- **Email**: `admin@demo.com`
- **Password**: `Admin@123`
- **Name**: Admin User
- **Access**: Full administrative privileges

## Quick Demo Access

The sign-in page features convenient "Quick Demo Access" buttons for instant testing:

### Demo Job Seeker Button

- **One-click access** to job seeker features
- **Pre-filled credentials**: Automatically logs in as `jobseeker@demo.com`
- **Full functionality**: Apply for jobs, manage applications, profile management

### Demo Company Button

- **One-click access** to company features
- **Pre-filled credentials**: Automatically logs in as `company@demo.com`
- **Full functionality**: Post jobs, manage company profile, review applications

### Demo Admin Button

- **One-click access** to admin features
- **Pre-filled credentials**: Automatically logs in as `admin@demo.com`
- **Full functionality**: User management, job management, system settings

## Getting Started

1. **Start the JSON Server** (Backend):

   ```bash
   npx json-server db.json --port 3000 --watch
   ```

2. **Start the Angular Development Server** (Frontend):

   ```bash
   ng serve
   ```

3. **Access the Application**:
   - Open your browser to `http://localhost:4200/`
   - Sign up as a Job Seeker or Company
   - Or use Quick Demo Access buttons on the sign-in page:
     - **Demo Job Seeker**: Instant access to job seeker features
     - **Demo Company**: Instant access to company features
   - Or sign in with pre-configured admin accounts for administrative access

## Security Notes

- Admin accounts are pre-created in the database for security
- Registration is limited to Job Seekers and Companies only
- Role-based access control is enforced throughout the application
- All routes are protected with appropriate guards
