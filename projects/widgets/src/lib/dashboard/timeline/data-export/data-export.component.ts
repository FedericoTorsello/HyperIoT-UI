import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { DialogRef, DIALOG_DATA, SelectOptionGroup } from 'components';
import { DataExport } from '../models/data-export,model';
import { Store } from '@ngrx/store';
import { DataExportNotificationActions, DataExportNotificationStore, HDeviceSelectors, HPacket, HPacketSelectors, HProjectSelectors, HprojectsService, Logger, LoggerService } from 'core';
import { catchError, combineLatest, concatMap, first, forkJoin, interval, map, of, switchMap, take, takeWhile, tap } from 'rxjs';
import { MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { NgxMatDateAdapter, } from '@angular-material-components/datetime-picker';
import { NgxMatMomentAdapter, NGX_MAT_MOMENT_DATE_ADAPTER_OPTIONS, NGX_MAT_MOMENT_FORMATS } from '@angular-material-components/moment-adapter';
import moment from 'moment';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { HttpClient } from '@angular/common/http';
import saveAs from 'file-saver';
import { MatSelectChange } from '@angular/material/select';

type ExportHPacketData = {
  processedRecords: number;
  totalRecords: number;
  exportId: string;
  started: boolean;
  completed: boolean;
  fileName: string;
  errorMessages: any[];
  hasErrors: boolean;
};

@Component({
  selector: 'hyperiot-data-export',
  templateUrl: './data-export.component.html',
  styleUrls: ['./data-export.component.scss'],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'it-IT' },
    { provide: NgxMatDateAdapter, useClass: NgxMatMomentAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: NGX_MAT_MOMENT_FORMATS },
    { provide: NGX_MAT_MOMENT_DATE_ADAPTER_OPTIONS, useValue: { useUtc: true } }
  ],
})
export class DataExportComponent implements OnInit {

  readonly maxLength = 255;

  exportErrorList: { hPacketId: number, exportId: string }[] = [];

  form = this.fb.group({
    startTime: [null, Validators.required],
    endTime: [null, Validators.required],
    exportName: [null, [Validators.required, Validators.maxLength(this.maxLength)]],
    hPacketFormat: [null, Validators.required],
  });

  readonly hPacketFormatEnum = HPacket.FormatEnum;

  private get startTime(): FormControl {
    return this.form.controls.startTime as FormControl;
  }

  private get endTime(): FormControl {
    return this.form.get('endTime') as FormControl;
  }

  private get hPacketFormat(): FormControl {
    return this.form.controls.hPacketFormat as FormControl;
  }

  private get exportName(): FormControl {
    return this.form.controls.exportName as FormControl;
  }

  private initialFormValue: Record<'startTime' | 'endTime', Date> = {
    startTime: undefined,
    endTime: undefined,
  };

  hPacketList: SelectOptionGroup[] = [];

  hPacketListSelected: HPacket[] = [];

  private hProjectId: number;

  private logger: Logger;

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private dialogRef: DialogRef<any>,
    @Inject(DIALOG_DATA) public data: DataExport,
    private hProjectsService: HprojectsService,
    private httpClient: HttpClient,
    loggerService: LoggerService,
  ) {
    this.logger = new Logger(loggerService);
    this.logger.registerClass(this.constructor.name);

    // this.hPacketsService
    //   .findAllHPacketByProjectId(this.projectId)
    //   .subscribe((res) => {
    //     this.allPackets = res;
    //     const devices = this.allPackets.map((x) => x.device);
    //     const groupDevices = [];
    //     devices.forEach((x) => {
    //       if (!groupDevices.some((y) => y.id === x.id)) {
    //         groupDevices.push(x);
    //       }
    //     });

    //     this.groupedPacketOptions = groupDevices.map((x) => ({
    //       name: x.deviceName,
    //       options: res
    //         .filter((y) => y.device.id === x.id)
    //         .map((y) => ({
    //           value: y.id,
    //           label: y.name,
    //           icon: 'icon-hyt_packets',
    //         })),
    //       icon: 'icon-hyt_device',
    //     }));
    //   });



    // this.store.select(HProjectSelectors.selectCurrentHProjectId)
    //   .pipe(
    //     tap((hProjectId) => this.hProjectId = hProjectId),
    //     switchMap((hProjectId) =>
    //       this.store.select(HDeviceSelectors.selectAllHDevices)
    //         .pipe(
    //           map((hDeviceList) => hDeviceList.filter(({ project }) => project.id === hProjectId))
    //         )
    //     ),
    //     switchMap((hDeviceList) =>
    //       this.store.select(HPacketSelectors.selectAllHPackets)
    //         .pipe(
    //           map((hPacketList) => {
    //             const deviceIdList = hDeviceList.map(({ id }) => id);
    //             return hPacketList.filter(({ device }) => deviceIdList.includes(device.id));
    //           })
    //         ))
    //   ).subscribe({
    //     next: (hPacketList) => {
    //       this.hPacketList = hPacketList.map((hPacket) => {
    //         const options: SelectOptionGroup = {
    //           name: 'Packets',
    //           options: [
    //             {
    //               value: hPacket,
    //               label: hPacket.name,
    //               icon: 'icon-hyt_packets'
    //             }
    //           ]
    //         };

    //         return options;
    //       });
    //     }
    //   });
  }

  ngOnInit(): void {

    this.store.select(HProjectSelectors.selectCurrentHProjectId)
      .pipe(
        tap((hProjectId) => this.hProjectId = hProjectId),
        switchMap((hProjectId) => combineLatest({
          hDeviceList: this.store.select(HDeviceSelectors.selectAllHDevices)
            .pipe(
              map((res) => res.filter(({ project }) => project.id === hProjectId)),
            )          ,
          hPacketList: this.store.select(HPacketSelectors.selectAllHPackets)
        })),
        take(1)
      ).subscribe({
        next: ({ hDeviceList, hPacketList }) => {
          this.hPacketList = hDeviceList.map((device) => ({
            name: device.deviceName,
            icon: 'icon-hyt_device',
            options: hPacketList
              .filter((hPacket) => hPacket.device.id === device.id)
              .map((hPacket) => ({
                value: hPacket,
                label: hPacket.name,
                icon: 'icon-hyt_packets',
              })),
          }));
        },
        error: (err) => {
          console.error(err);
        }
      });

    const { timeInterval, domain } = this.data;

    let interval: Date[] = [];
    if (timeInterval.length) {
      interval = timeInterval;
    } else if (domain.length) {
      interval = domain;
    }

    if (interval.length) {
      this.initialFormValue = {
        startTime: interval[0],
        endTime: interval[1],
      };

      this.form.patchValue({ ...this.initialFormValue });
    }
  }

  closeModal(event?: any): void {
    this.dialogRef.close(event);
  }

  export() {
    this.exportErrorList = [];

    const hProjectId = this.hProjectId;
    const exportName = this.exportName.value;
    const startTime = moment(this.startTime.value).valueOf(); //moment unix timestamp in milliseconds
    const endTime = moment(this.endTime.value).valueOf(); //moment unix timestamp in milliseconds

    const hPacketFormat = this.hPacketFormat.value as HPacket.FormatEnum;

    const exportFormat = new Map<HPacket.FormatEnum, string>([
      [HPacket.FormatEnum.CSV, '.csv'],
      [HPacket.FormatEnum.JSON, '.json'],
      [HPacket.FormatEnum.TEXT, '.txt'],
      [HPacket.FormatEnum.XML, '.xml'],
    ]);

    for (let index = 0; index < this.hPacketListSelected.length; index++) {
      const hPacket = this.hPacketListSelected[index];

      const hPacketId = hPacket.id;

      const fullFileName = this.hPacketListSelected.length > 1
        ? `${exportName}-${index}${exportFormat.get(hPacketFormat)}`
        : `${exportName}${exportFormat.get(hPacketFormat)}`;

      this.hProjectsService.exportHPacketData(
        hProjectId,
        hPacketId,
        hPacketFormat,
        exportName,
        startTime,
        endTime
      ).pipe(
        tap(({ exportId, started }: ExportHPacketData) => {
          if (started) {
            this.dialogRef.close('export');

            new Notification('Download ' + hPacketId);

            const dataExportNotification: DataExportNotificationStore.DataExportNotification = {
              exportParams: {
                exportId,
                hProjectId,
                hPacketId,
                hPacketFormat,
                exportName,
                startTime,
                endTime
              },
              download: {
                fullFileName,
                progress: 0,
                lastDownload: undefined
              }

            };

            this.store.dispatch(DataExportNotificationActions.setNotification({ notification: dataExportNotification }));
          }
        }),
        switchMap(({ exportId }: ExportHPacketData) =>
          interval(500)
            .pipe(
              switchMap(() => this.hProjectsService.getExportStatus(exportId)),
              takeWhile(({ completed, hasErrors }: ExportHPacketData) => !(completed || hasErrors), true),
              catchError((error) => {
                this.logger.error('Error:', error);
                return of({ hasErrors: true });
              })
            )
        ),
        concatMap((status: ExportHPacketData) => {
          if (status.completed) {
            return forkJoin({
              blob: this.httpClient.get(
                `/hyperiot/hprojects/export/download/${encodeURIComponent(status.exportId)}`,
                {
                  responseType: 'blob'
                }
              ),
              status: of(status)
            })
          } else {
            return of(status);
          }
        })
      ).subscribe({
        next: (exportData: ExportHPacketData | { blob: Blob; status: ExportHPacketData; }) => {
          const { processedRecords, totalRecords, exportId } = 'blob' in exportData ? exportData.status : exportData;
          const progress = this.percentageRecordsProcessed(processedRecords, totalRecords);
          this.logger.debug('Progress:', progress);

          const dataExportNotification: DataExportNotificationStore.DataExportNotification = {
            exportParams: {
              exportId,
              hProjectId,
              hPacketId,
              hPacketFormat,
              exportName,
              startTime,
              endTime
            },
            download: {
              fullFileName,
              progress,
              lastDownload: progress < 100 ? undefined : new Date()
            }
          };

          this.store.dispatch(
            DataExportNotificationActions.updateNotification({
              update: {
                id: exportId,
                changes: dataExportNotification
              }
            })
          );

          if ('blob' in exportData) {
            try {
              saveAs(exportData.blob, fullFileName);
            } catch (error) {
              this.logger.error('Download error');
            }
          } else {
            if (exportData.hasErrors) {
              this.logger.error('Error:', exportData.errorMessages);
            } else {
              this.logger.debug('Value:', exportData);
            }
          }
        },
        error: (err) => {
          this.logger.error(err);
        }
      });
    }
  }

  private percentageRecordsProcessed(processedRecords: number, totalRecords: number) {
    return processedRecords >= totalRecords
      ? 100
      : Math.round((processedRecords / totalRecords) * 100);
  }

  onAddPacket(hPacket: HPacket) {
    if (!this.hPacketListSelected.some((item) => item.id === hPacket.id)) {
      this.hPacketListSelected.push(hPacket);
    }
  }

  resetForm() {
    this.hPacketListSelected = [];

    this.form.reset({ ...this.initialFormValue });

    this.exportErrorList = [];
  }

  removeHPacket(hPacket: HPacket): void {
    const index = this.hPacketListSelected.indexOf(hPacket);

    if (index >= 0) {
      this.hPacketListSelected.splice(index, 1);
    }
  }
}
