<?php

namespace Demovox;

class CronMailIndex extends CronBase
{
	const STATUS_INIT = 0;
	const STATUS_RUNNING = 1;
	const STATUS_FINISHED = 2;

	protected $maxSignsPerCall = 200;

	public function run()
	{
		if (!Config::getValue('mail_remind_sheet_enabled')) {
			$this->setSkipped('Reminder mails are disabled in config');
			return;
		}
		if (!Config::getValue('mail_remind_dedup')) {
			$this->setSkipped('Reminder mail deduplication is disabled in config');
			return;
		}
		if (!$this->prepareRun()) {
			return;
		}
		$this->setRunningStart();
		$this->indexMails();
		$this->setRunningStop();
	}

	protected function indexMails()
	{
		// Set state
		$status = Core::getOption('cron_index_mail_status');
		$lastImportId = Core::getOption('cron_index_mail_last_import_id');
		if ($status === false || $status === self::STATUS_INIT) {
			$statusRun = self::STATUS_INIT;
		} else {
			$statusRun = self::STATUS_RUNNING;
		}
		Core::setOption('cron_index_mail_status', $statusRun);

		list($count, $rows) = $this->getRowsToImport($lastImportId);

		if ($count) {
			foreach ($rows as $row) {
				$lastImportId = $this->importRow($row);
			}

			if ($lastImportId !== null) {
				Core::setOption('cron_index_mail_last_import_id', $lastImportId);
			}
		}

		if ($statusRun === self::STATUS_INIT && $count > count($rows)) {
			$statusEnd = self::STATUS_INIT;
			$this->setStatusMessage('Imported ' . count($rows) . ' mail addresses, ' . $count - count($rows) . ' more to go');
		} else {
			$statusEnd = self::STATUS_FINISHED;
			$this->setStatusMessage('Imported ' . count($rows) . ' mail addresses');
		}
		Core::setOption('cron_index_mail_status', $statusEnd);
	}

	/**
	 * @param object $row signature row
	 * @return int signature id
	 */
	protected function importRow($row)
	{
		$hashedMail = Strings::hashMail($row->mail);
		$mailRow = DB::getRow(
			[
				'ID',
				'creation_date',
				'is_step2_done',
				'is_sheet_received',
				'is_remind_sheet_sent',
				'is_remind_signup_sent',
			],
			"mail = '" . $hashedMail . "'",
			DB::TABLE_MAIL
		);

		if (!$mailRow) {
			$setMailData = [
				'sign_ID'               => $row->ID,
				'mail'                  => $hashedMail,
				'creation_date'         => $row->creation_date,
				'is_step2_done'         => $row->is_step2_done ? 1 : 0,
				'is_sheet_received'     => $row->is_sheet_received ? 1 : 0,
				'is_remind_sheet_sent'  => $row->is_remind_sheet_sent,
				'is_remind_signup_sent' => $row->is_remind_signup_sent,
			];
			$save = DB::insert($setMailData, DB::TABLE_MAIL);
		} else {
			$setMailData = [];
			$setMailData['sign_ID'] = $row->ID;
			$setMailData['creation_date'] = $row->creation_date;
			if (!$mailRow->is_step2_done && $row->is_step2_done) {
				$setMailData['is_step2_done'] = 1;
			}
			if (!$mailRow->is_sheet_received && $row->is_sheet_received) {
				$setMailData['is_sheet_received'] = 1;
			}
			if ($mailRow->is_remind_sheet_sent !== 1 && $row->is_remind_sheet_sent == 1) {
				$setMailData['is_remind_sheet_sent'] = 1;
			}
			if ($mailRow->is_remind_signup_sent !== 1 && $row->is_remind_signup_sent == 1) {
				$setMailData['is_remind_signup_sent'] = 1;
			}
			$save = DB::updateStatus($setMailData, ['ID' => $mailRow->ID], DB::TABLE_MAIL);
		}

		if ($save === false) {
			$msg = 'Exception on save mail status with sign_ID=' . $row->ID . ' with error:' . DB::getError();
			Core::showError($msg, 500);
			$this->setStatusMessage('Could not save mail from signature ID ' . $row->ID, false);
			return null;
		}

		return intval($row->ID);
	}

	/**
	 * @param int $lastImportId
	 * @return array|null
	 */
	protected function getRowsToImport($lastImportId)
	{
		// To ensure we get the correct is_step2_done for signatures a client is still working on, wait for all php sessions to die
		$maxDate = date("Y-m-d G:i:s", strtotime('12 hour ago'));
		$where = "is_deleted = 0 AND creation_date < '{$maxDate}'";
		if ($lastImportId !== false) {
			$where .= ' AND ID > ' . $lastImportId;
		}
		$count = DB::count($where, DB::TABLE_SIGN);
		if (!$count) {
			return null;
		}

		$sqlAppend = ($count > $this->maxSignsPerCall ? ' LIMIT ' . $this->maxSignsPerCall : '')
			. ' ORDER BY ID ASC';
		$rows = DB::getResults(
			[
				'ID',
				'mail',
				'creation_date',
				'is_step2_done',
				'is_sheet_received',
				'is_remind_sheet_sent',
				'is_remind_signup_sent',
			],
			$where,
			$sqlAppend,
			DB::TABLE_SIGN
		);

		$this->log('Loaded ' . count($rows) . ' signatures to index their mail (there is a total of ' . $count
			. ' to import, max ' . $this->maxSignsPerCall . ' per execution)', 'notice');

		return [$count, $rows];
	}
}