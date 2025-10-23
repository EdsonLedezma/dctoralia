import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { z } from "zod";

export const useSchedule = createTRPCRouter({
  // Obtener horarios por doctor (público)
  publicGetByDoctor: publicProcedure.input(z.object({ doctorId: z.string() })).query(async ({ input, ctx }) => {
    try {
      const schedules = await ctx.db.schedule.findMany({ where: { doctorId: input.doctorId } });
      return {
        status: 200,
        message: "Horarios obtenidos correctamente",
        result: schedules,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al obtener horarios",
        result: null,
        error,
      };
    }
  }),
  // Crear horario para un doctor
  create: protectedProcedure.input(z.object({
    doctorId: z.string(),
    dayOfWeek: z.number().min(0).max(6), // 0=Domingo, 6=Sábado
    startTime: z.string(),
    endTime: z.string(),
  })).mutation(async ({ input, ctx }) => {
    try {
      const schedule = await ctx.db.schedule.create({
        data: {
          doctorId: input.doctorId,
          dayOfWeek: input.dayOfWeek,
          startTime: input.startTime,
          endTime: input.endTime,
        },
      });
      return {
        status: 201,
        message: "Horario creado correctamente",
        result: schedule,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al crear horario (puede que ya exista para ese día)",
        result: null,
        error,
      };
    }
  }),

  // Obtener todos los horarios de un doctor
  getByDoctor: protectedProcedure.input(z.object({ doctorId: z.string() })).query(async ({ input, ctx }) => {
    try {
      const schedules = await ctx.db.schedule.findMany({ where: { doctorId: input.doctorId } });
      return {
        status: 200,
        message: "Horarios obtenidos correctamente",
        result: schedules,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al obtener horarios",
        result: null,
        error,
      };
    }
  }),

  // Actualizar horario de un día específico
  update: protectedProcedure.input(z.object({
    id: z.string(),
    startTime: z.string(),
    endTime: z.string(),
  })).mutation(async ({ input, ctx }) => {
    try {
      const schedule = await ctx.db.schedule.update({
        where: { id: input.id },
        data: {
          startTime: input.startTime,
          endTime: input.endTime,
        },
      });
      return {
        status: 200,
        message: "Horario actualizado correctamente",
        result: schedule,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al actualizar horario",
        result: null,
        error,
      };
    }
  }),

  // Actualizar estado activo
  updateIsActive: protectedProcedure.input(z.object({ id: z.string(), isActive: z.boolean() })).mutation(async ({ input, ctx }) => {
    try {
      const schedule = await ctx.db.schedule.update({ 
        where: { id: input.id }, 
        data: { isActive: input.isActive } 
      });
      return {
        status: 200,
        message: "Estado actualizado correctamente",
        result: schedule.isActive,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al actualizar el estado",
        result: null,
        error,
      };
    }
  }),

  // Eliminar horario de un día específico
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input, ctx }) => {
    try {
      const deleted = await ctx.db.schedule.delete({ where: { id: input.id } });
      return {
        status: 200,
        message: "Horario eliminado correctamente",
        result: deleted,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al eliminar horario",
        result: null,
        error,
      };
    }
  }),

  // Obtener slots disponibles para un doctor en un rango de fechas
  getAvailableSlots: publicProcedure.input(z.object({ 
    doctorId: z.string(),
    startDate: z.string(), // YYYY-MM-DD
    endDate: z.string(), // YYYY-MM-DD
  })).query(async ({ input, ctx }) => {
    try {
      const { doctorId, startDate, endDate } = input;
      
      // Obtener horarios del doctor
      const schedules = await ctx.db.schedule.findMany({ 
        where: { doctorId, isActive: true } 
      });
      
      // Obtener citas existentes en el rango de fechas
      const appointments = await ctx.db.appointment.findMany({
        where: {
          doctorId,
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
          status: {
            in: ['PENDING', 'CONFIRMED']
          }
        },
        select: {
          date: true,
          time: true,
          duration: true,
        }
      });

      // Generar slots disponibles
      const availableSlots: { date: string; time: string }[] = [];
      const start = new Date(startDate);
      const end = new Date(endDate);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        const dateStr = d.toISOString().split('T')[0];
        
        // Buscar horario para este día de la semana
        const daySchedule = schedules.find(s => s.dayOfWeek === dayOfWeek);
        if (!daySchedule) continue;

        // Generar slots de 30 minutos entre startTime y endTime
        const [startHour, startMin] = daySchedule.startTime.split(':').map(Number);
        const [endHour, endMin] = daySchedule.endTime.split(':').map(Number);
        
        let currentMinutes = startHour! * 60 + startMin!;
        const endMinutes = endHour! * 60 + endMin!;

        while (currentMinutes < endMinutes) {
          const hours = Math.floor(currentMinutes / 60).toString().padStart(2, '0');
          const minutes = (currentMinutes % 60).toString().padStart(2, '0');
          const timeSlot = `${hours}:${minutes}`;

          // Verificar si el slot está ocupado
          const isOccupied = appointments.some(apt => {
            const aptDateStr = apt.date.toISOString().split('T')[0];
            return aptDateStr === dateStr && apt.time === timeSlot;
          });

          if (!isOccupied) {
            availableSlots.push({ date: dateStr!, time: timeSlot });
          }

          currentMinutes += 30; // Incremento de 30 minutos
        }
      }

      return {
        status: 200,
        message: "Slots disponibles obtenidos correctamente",
        result: availableSlots,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al obtener slots disponibles",
        result: null,
        error,
      };
    }
  }),
});
