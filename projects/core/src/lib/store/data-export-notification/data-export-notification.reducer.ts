import { createReducer, on } from "@ngrx/store";
import { createEntityAdapter, EntityAdapter, EntityState } from "@ngrx/entity";
import { DataExportNotificationActions } from "./data-export-notification.actions";
import { HPacket } from "../../hyperiot-client/models/hPacket";

export namespace DataExportNotificationStore {

  export const key = 'dataExportNotification';

  export interface DataExportNotification {
    data: {
      exportParams: {
        exportId: string;
        exportName: string,
        hProjectId: number;
        hPacketId: number;
        hPacketFormat: HPacket.FormatEnum,
        startTime: number,
        endTime: number,
      }
      download: {
        fullFileName: string;
        progress: number,
        lastDownload: Date | undefined
      }
    }
  }

  const adapter: EntityAdapter<DataExportNotification> = createEntityAdapter<DataExportNotification>({
    selectId: (notification) => notification.data.exportParams.exportId
  });

  export interface State extends EntityState<DataExportNotification> {
    // additional entities state properties
    selectedNotificationId: string | null;
    onProgress: boolean;
  }

  const initialState: State = adapter.getInitialState({
    // additional entity state properties
    selectedNotificationId: null,
    onProgress: false,
  });

  export const reducer = createReducer(
    initialState,
    on(DataExportNotificationActions.setNotification, (state, { notification }) => {
      return adapter.setOne(notification, state)
    }),
    on(DataExportNotificationActions.deleteNotification, (state, { id }) => {
      return adapter.removeOne(id, state)
    }),
    on(DataExportNotificationActions.updateNotification, (state, { update }) => {
      return adapter.updateOne(update, {
        ...state,
        onProcess: update.changes.data.download.progress < 100
      });
    }),
  )

  export const getSelectedNotificationId = (state: State) => state.selectedNotificationId;

  // get the selectors
  const {
    selectIds,
    selectEntities,
    selectAll,
    selectTotal,
  } = adapter.getSelectors();

  // select the array of notification ids
  export const selectNotificationIds = selectIds;

  // select the dictionary of notification entities
  export const selectNotificationEntities = selectEntities;

  // select the array of notifications
  export const selectAllNotifications = selectAll;

  // select the total notification count
  export const selectNotificationTotal = selectTotal;

}
