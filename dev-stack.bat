@echo off
setlocal

set ACTION=%~1
if "%ACTION%"=="" set ACTION=help

if /I "%ACTION%"=="up" goto :up
if /I "%ACTION%"=="rebuild" goto :rebuild
if /I "%ACTION%"=="down" goto :down
if /I "%ACTION%"=="ps" goto :ps
if /I "%ACTION%"=="migrate" goto :migrate
if /I "%ACTION%"=="health-check" goto :health_check
if /I "%ACTION%"=="logs-backend" goto :logs_backend
if /I "%ACTION%"=="logs-storefront" goto :logs_storefront
if /I "%ACTION%"=="help" goto :help

echo Unknown command: %ACTION%
echo.
goto :help

:up
echo Starting all services...
docker-compose up -d
if errorlevel 1 goto :error
goto :done

:rebuild
echo Rebuilding and starting all services...
docker-compose up -d --build
if errorlevel 1 goto :error
goto :done

:down
echo Stopping all services...
docker-compose down
if errorlevel 1 goto :error
goto :done

:ps
docker-compose ps
if errorlevel 1 goto :error
goto :done

:migrate
echo Running backend database migrations in medusa-server container...
docker-compose exec -T medusa-server npm run db:migrate
if errorlevel 1 goto :error
goto :done

:health_check
set HEALTH_FAILED=0
echo Checking container status...
docker-compose ps
if errorlevel 1 goto :error

echo.
echo Checking backend health endpoint (http://localhost:9000/health)...
curl -fsS http://localhost:9000/health >nul
if errorlevel 1 (
  echo Backend health check failed.
  set HEALTH_FAILED=1
) else (
  echo Backend is healthy.
)

echo.
echo Checking storefront endpoint (http://localhost:8000)...
curl -fsS http://localhost:8000 >nul
if errorlevel 1 (
  echo Storefront health check failed.
  set HEALTH_FAILED=1
) else (
  echo Storefront is reachable.
)

if "%HEALTH_FAILED%"=="1" (
  echo.
  echo One or more health checks failed.
  exit /b 1
)

echo.
echo All health checks passed.
goto :done

:logs_backend
docker logs -f medusa_server_core_v2
if errorlevel 1 goto :error
goto :done

:logs_storefront
docker logs -f medusa_storefront
if errorlevel 1 goto :error
goto :done

:help
echo Usage:
echo   dev-stack.bat up
echo   dev-stack.bat rebuild
echo   dev-stack.bat down
echo   dev-stack.bat ps
echo   dev-stack.bat migrate
echo   dev-stack.bat health-check
echo   dev-stack.bat logs-backend
echo   dev-stack.bat logs-storefront
echo.
echo Notes:
echo   - Run from project root.
echo   - Requires Docker Desktop and docker-compose.
goto :eof

:error
echo.
echo Command failed with exit code %errorlevel%.
exit /b %errorlevel%

:done
echo.
echo Done.
exit /b 0
